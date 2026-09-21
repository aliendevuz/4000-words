"""dictionary.db -> dist/v{FORMAT_VERSION}/... eksport skripti.

docs/distribution.md'dagi modelga mos: header'siz CSV ("*.data"),
chapter darajasida bo'lingan, har biri gzip bilan siqilgan va
.sha256 bilan tasdiqlangan, ustidan manifest.json + schema.json.

Ishlatilishi:
    python dist.py
"""

import csv
import gzip
import hashlib
import io
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "dictionary.db"
FORMAT_VERSION = 1
OUT_DIR = ROOT / "dist" / f"v{FORMAT_VERSION}"

# part turi -> ustun tartibi (schema.json shundan generatsiya qilinadi)
SCHEMA = {
    "languages": ["id", "language"],
    "types": ["id", "type"],
    "words": ["id", "language", "word"],
    "word_types": ["id", "word_id", "type_id", "transcript"],
    "definitions": ["id", "word_type_id", "definition"],
    "samples": ["id", "word_type_id", "sample"],
    "vocabularies": [
        "id", "from_language", "to_language", "from_word_type",
        "to_word_type", "transcript", "definition", "deprecated",
        "replaced_by",
    ],
    "courses": ["id", "name", "description", "from_language", "to_language", "order"],
    "chapters": ["id", "name", "description", "course_id", "order", "background_color"],
    "units": ["id", "name", "description", "chapter_id", "order"],
    "unit_words": ["id", "unit_id", "word_type_id", "order"],
    "stories": ["id", "language_id", "unit_id", "title", "body"],
    # "path" ATAYLAB yo'q - bu server ichki (R2 xom manba) yo'li,
    # clientga kerak emas. Rasmlar R2'da to'g'ridan-to'g'ri
    # "pictures/{word_type_id}.jpg" konvensiyasi bilan alohida-alohida
    # yotadi (up.py orqali yuklanadi) - client URL'ni o'zi quradi.
    # Bu jadvalning distributsiyadagi yagona vazifasi - "shu
    # word_type'ning rasmi bor" degan signal.
    "word_pictures": ["id", "word_type_id"],
}


def rows_to_csv_bytes(rows: list[tuple]) -> bytes:
    buf = io.StringIO(newline="")
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
    for row in rows:
        writer.writerow("" if v is None else v for v in row)
    return buf.getvalue().encode("utf-8")


class Part:
    """Bitta .data qism: nom + kirituvchi (table -> rows) to'plami."""

    def __init__(self, path: str):
        self.path = path
        self.tables: dict[str, list[tuple]] = {}

    def add(self, table: str, rows: list[tuple]):
        self.tables.setdefault(table, []).extend(rows)

    def serialize(self) -> bytes:
        # bitta .data faylida bir nechta jadval bo'lsa, har biri
        # "#tablename" belgisi bilan ajratiladi (schema.json orqali
        # qaysi ustunlar ekani ma'lum).
        out = io.StringIO(newline="")
        for table, rows in self.tables.items():
            out.write(f"#{table}\n")
            out.write(rows_to_csv_bytes(rows).decode("utf-8"))
        return out.getvalue().encode("utf-8")


def fetch(conn: sqlite3.Connection, table: str, where: str = "", params: tuple = ()) -> list[tuple]:
    cols = ", ".join(f'"{c}"' for c in SCHEMA[table])
    sql = f"select {cols} from {table}"
    if where:
        sql += f" where {where}"
    return conn.execute(sql, params).fetchall()


def chunks(seq, size=500):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def in_clause(ids: set[int]) -> tuple[str, tuple]:
    if not ids:
        return "0", ()
    placeholders = ",".join("?" for _ in ids)
    return placeholders, tuple(ids)


def build_chapter_part(conn: sqlite3.Connection, course_row, chapter_row) -> Part:
    course_id = course_row[0]
    chapter_id = chapter_row[0]

    unit_rows = fetch(conn, "units", "chapter_id=?", (chapter_id,))
    unit_ids = {r[0] for r in unit_rows}

    ph, params = in_clause(unit_ids)
    unit_word_rows = fetch(conn, "unit_words", f"unit_id in ({ph})", params)
    source_wt_ids = {r[2] for r in unit_word_rows}  # word_type_id column

    ph, params = in_clause(source_wt_ids)
    vocab_rows = fetch(conn, "vocabularies", f"from_word_type in ({ph})", params)
    target_wt_ids = {r[4] for r in vocab_rows}  # to_word_type column

    all_wt_ids = source_wt_ids | target_wt_ids
    ph, params = in_clause(all_wt_ids)
    word_type_rows = fetch(conn, "word_types", f"id in ({ph})", params)
    word_ids = {r[1] for r in word_type_rows}  # word_id column

    ph, params = in_clause(word_ids)
    word_rows = fetch(conn, "words", f"id in ({ph})", params)

    ph, params = in_clause(all_wt_ids)
    definition_rows = fetch(conn, "definitions", f"word_type_id in ({ph})", params)
    sample_rows = fetch(conn, "samples", f"word_type_id in ({ph})", params)
    picture_rows = fetch(conn, "word_pictures", f"word_type_id in ({ph})", params)

    ph, params = in_clause(unit_ids)
    story_rows = fetch(conn, "stories", f"unit_id in ({ph})", params)

    part = Part(f"{course_row[1].lower()}/chapter-{chapter_row[4]}.data")
    part.add("units", unit_rows)
    part.add("unit_words", unit_word_rows)
    part.add("word_types", word_type_rows)
    part.add("words", word_rows)
    part.add("definitions", definition_rows)
    part.add("samples", sample_rows)
    part.add("word_pictures", picture_rows)
    part.add("vocabularies", vocab_rows)
    part.add("stories", story_rows)
    return part


def write_part(part: Part) -> dict:
    raw = part.serialize()
    gz = gzip.compress(raw, compresslevel=9)

    dest = OUT_DIR / part.path
    dest = dest.with_suffix(dest.suffix + ".gz")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(gz)

    sha = hashlib.sha256(gz).hexdigest()
    (dest.parent / (dest.name + ".sha256")).write_text(sha + "\n")

    return {
        "path": str(dest.relative_to(OUT_DIR)).replace("\\", "/"),
        "sha256": sha,
        "raw_bytes": len(raw),
        "gz_bytes": len(gz),
        "kind": "data",
    }


def main():
    if OUT_DIR.exists():
        import shutil

        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    conn = sqlite3.connect(DB_PATH)
    manifest_parts = []

    # --- umumiy (kichik) ma'lumotnomalar: root darajasida, bir marta ---
    ref_part = Part("common.data")
    ref_part.add("languages", fetch(conn, "languages"))
    ref_part.add("types", fetch(conn, "types"))
    ref_part.add("courses", fetch(conn, "courses"))
    ref_part.add("chapters", fetch(conn, "chapters"))
    manifest_parts.append(write_part(ref_part))

    # --- har bir kurs -> har bir bob uchun alohida .data ---
    for course_row in conn.execute("select id, name from courses order by \"order\"").fetchall():
        for chapter_row in conn.execute(
            'select id, name, description, course_id, "order" from chapters where course_id=? order by "order"',
            (course_row[0],),
        ).fetchall():
            part = build_chapter_part(conn, course_row, chapter_row)
            manifest_parts.append(write_part(part))

    schema_bytes = json.dumps(SCHEMA, indent=2, ensure_ascii=False).encode("utf-8")
    (OUT_DIR / "schema.json").write_bytes(schema_bytes)

    manifest = {
        "format_version": FORMAT_VERSION,
        "parts": manifest_parts,
    }
    manifest_bytes = json.dumps(manifest, indent=2, ensure_ascii=False).encode("utf-8")
    (OUT_DIR / "manifest.json").write_bytes(manifest_bytes)

    conn.close()

    # --- metrikalar ---
    db_size = DB_PATH.stat().st_size
    total_raw = sum(p["raw_bytes"] for p in manifest_parts)
    total_gz = sum(p["gz_bytes"] for p in manifest_parts)
    total_gz += len(schema_bytes) + len(manifest_bytes)

    def mb(n):
        return n / 1024 / 1024

    print(f"dictionary.db (asl baza):        {mb(db_size):8.2f} MB")
    print(f"dist .data (CSV, siqilmagan):     {mb(total_raw):8.2f} MB  ({total_raw / db_size:.1%} dan asl bazaga nisbatan)")
    print(f"dist .data.gz (yakuniy, R2'ga):   {mb(total_gz):8.2f} MB  ({total_gz / db_size:.1%} asl bazaga nisbatan)")
    print(f"Tejalgan hajm (db -> gz):          {mb(db_size - total_gz):8.2f} MB  ({(1 - total_gz / db_size):.1%})")
    print(f"Qismlar soni: {len(manifest_parts)}")


if __name__ == "__main__":
    main()
