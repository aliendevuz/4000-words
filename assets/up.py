"""R2'ga yuklash skripti - uchta mustaqil qism:

1. `dist/` (dictionary.db'dan `dist.py` chiqargan .data.gz/manifest/schema)
   -> R2'da `{UPLOAD_PREFIX}/...` ostida (versiyalangan, format_version'ga bog'liq)
2. `storage/pictures/*.jpg` -> R2'da `pictures/{word_type_id}.jpg` deb,
   HAR BIR RASM ALOHIDA (bundle/zip YO'Q - client Coil/Glide kabi
   kutubxonalar bilan to'g'ridan-to'g'ri URL orqali yuklasin uchun).
3. `storage/chapters/*` (bob muqovalari) -> R2'da `chapters/{chapter_id}.{ext}`.

Uchalasi ham versiyalanmagan - fayl o'zgarmasa qayta yuklanmaydi.

O'zgarmagan fayllarni qayta yuklamaydi - har bir obyekt R2'da
`sha256` metadata bilan saqlanadi, yuklashdan oldin solishtiriladi
(eski upr2.js'dagi "skip unchanged files" mantig'iga o'xshash).

.env orqali sozlanadi - qarang `.env.example`.

Ishlatilishi:
    python up.py                    # dist/ + pictures/ + chapters/ ni sinxronlaydi
    python up.py --dry-run           # nima yuklanishini ko'rsatadi, yuklamaydi
    python up.py --only dist         # faqat dist/
    python up.py --only pictures     # faqat so'z rasmlari
    python up.py --only chapters     # faqat bob muqovalari
"""

import hashlib
import os
import sqlite3
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent
DIST_DIR = ROOT / "dist"
DB_PATH = ROOT / "dictionary.db"

R2_ENDPOINT = os.environ.get("R2_ENDPOINT")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET = os.environ.get("R2_BUCKET")
UPLOAD_CONCURRENCY = int(os.environ.get("UPLOAD_CONCURRENCY", "8"))
UPLOAD_VERBOSE = os.environ.get("UPLOAD_VERBOSE", "0") == "1"
# dist/ fayllari R2'da shu prefiks ostida saqlanadi (masalan "dist/v1/...")
UPLOAD_PREFIX = os.environ.get("UPLOAD_PREFIX", "dist")
# rasmlar R2'da shu prefiks ostida, versiyasiz: "pictures/{word_type_id}.jpg"
PICTURES_PREFIX = os.environ.get("PICTURES_PREFIX", "pictures")
# bob muqovalari R2'da: "chapters/{chapter_id}.{ext}"
CHAPTERS_PREFIX = os.environ.get("CHAPTERS_PREFIX", "chapters")


def require_env():
    missing = [
        name
        for name, val in [
            ("R2_ENDPOINT", R2_ENDPOINT),
            ("R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID),
            ("R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY),
            ("R2_BUCKET", R2_BUCKET),
        ]
        if not val
    ]
    if missing:
        raise SystemExit(
            f".env to'liq emas, yetishmayapti: {', '.join(missing)} "
            f"(.env.example'ga qarang)"
        )


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def content_type_for(path: Path) -> str:
    if path.suffix == ".json":
        return "application/json"
    if path.suffix == ".gz":
        return "application/gzip"
    if path.suffix in (".jpg", ".jpeg"):
        return "image/jpeg"
    return "text/plain"


def dist_targets() -> list[tuple[Path, str]]:
    if not DIST_DIR.exists():
        raise SystemExit(f"{DIST_DIR} topilmadi - avval `python dist.py` ishga tushiring")
    return [
        (p, f"{UPLOAD_PREFIX}/{p.relative_to(DIST_DIR).as_posix()}")
        for p in sorted(DIST_DIR.rglob("*"))
        if p.is_file()
    ]


def picture_targets() -> list[tuple[Path, str]]:
    """word_pictures jadvalidan word_type_id -> lokal fayl xaritasi
    olinadi, R2 kaliti esa word_type_id bilan generatsiya qilinadi
    (guruh-subgroup-index nomlash clientga ko'rinmaydi)."""
    if not DB_PATH.exists():
        raise SystemExit(f"{DB_PATH} topilmadi")
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("select word_type_id, path from word_pictures").fetchall()
    conn.close()

    targets = []
    for word_type_id, rel_path in rows:
        local = ROOT / rel_path
        if not local.exists():
            print(f"OGOHLANTIRISH: {local} topilmadi, o'tkazib yuborildi", file=sys.stderr)
            continue
        targets.append((local, f"{PICTURES_PREFIX}/{word_type_id}.jpg"))
    return targets


def chapter_picture_targets() -> list[tuple[Path, str]]:
    """chapter_pictures jadvalidan chapter_id -> lokal fayl xaritasi.
    Bob muqovalari kam sonli va deyarli o'zgarmaydi, shuning uchun
    versiyasiz, doimiy kalit bilan: chapters/{chapter_id}.{ext}."""
    if not DB_PATH.exists():
        raise SystemExit(f"{DB_PATH} topilmadi")
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("select chapter_id, path from chapter_pictures").fetchall()
    conn.close()

    targets = []
    for chapter_id, rel_path in rows:
        local = ROOT / rel_path
        if not local.exists():
            print(f"OGOHLANTIRISH: {local} topilmadi, o'tkazib yuborildi", file=sys.stderr)
            continue
        targets.append((local, f"{CHAPTERS_PREFIX}/{chapter_id}{local.suffix}"))
    return targets


class Uploader:
    def __init__(self, dry_run: bool):
        self.dry_run = dry_run
        self.client = boto3.client(
            "s3",
            endpoint_url=R2_ENDPOINT,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        )
        self.uploaded_bytes = 0
        self.skipped_bytes = 0
        self.uploaded_count = 0
        self.skipped_count = 0

    def remote_sha256(self, key: str) -> str | None:
        try:
            head = self.client.head_object(Bucket=R2_BUCKET, Key=key)
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
                return None
            raise
        return head.get("Metadata", {}).get("sha256")

    def sync_one(self, local_path: Path, key: str):
        local_hash = sha256_of(local_path)
        size = local_path.stat().st_size

        if self.remote_sha256(key) == local_hash:
            self.skipped_bytes += size
            self.skipped_count += 1
            if UPLOAD_VERBOSE:
                print(f"= {key} (o'zgarmagan)")
            return

        if self.dry_run:
            print(f"+ {key} (yuklanadi, {size} bayt)")
            return

        self.client.upload_file(
            str(local_path),
            R2_BUCKET,
            key,
            ExtraArgs={
                "ContentType": content_type_for(local_path),
                "Metadata": {"sha256": local_hash},
            },
        )
        self.uploaded_bytes += size
        self.uploaded_count += 1
        print(f"^ {key} ({size} bayt)")

    def run(self, targets: list[tuple[Path, str]]):
        with ThreadPoolExecutor(max_workers=UPLOAD_CONCURRENCY) as pool:
            futures = [pool.submit(self.sync_one, path, key) for path, key in targets]
            for fut in as_completed(futures):
                fut.result()  # xato bo'lsa shu yerda ko'tariladi


def mb(n):
    return n / 1024 / 1024


def main():
    dry_run = "--dry-run" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]

    require_env()
    up = Uploader(dry_run=dry_run)

    if only in (None, "dist"):
        targets = dist_targets()
        print(f"--- dist/ : {len(targets)} ta fayl ---")
        up.run(targets)

    if only in (None, "pictures"):
        targets = picture_targets()
        print(f"--- pictures/ : {len(targets)} ta fayl ---")
        up.run(targets)

    if only in (None, "chapters"):
        targets = chapter_picture_targets()
        print(f"--- chapters/ : {len(targets)} ta fayl ---")
        up.run(targets)

    print()
    print(f"Yuklandi:      {up.uploaded_count} fayl, {mb(up.uploaded_bytes):.2f} MB")
    print(f"O'tkazildi:    {up.skipped_count} fayl, {mb(up.skipped_bytes):.2f} MB (o'zgarmagan)")


if __name__ == "__main__":
    main()
