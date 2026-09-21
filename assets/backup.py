"""dictionary.db uchun backup/restore skripti.

seed.py endi yo'q - JSON manba faqat tarixiy arxiv sifatida qoladi va
bazani qayta yaratish uchun ishlatilmaydi. Shu kundan boshlab
`dictionary.db`ning o'zi asosiy manba: har qanday qo'lda qilingan
tuzatish (tarjima, deprecated/replaced_by va h.k.) faqat shu faylda
saqlanadi, shuning uchun uni muntazam backup qilish kerak.

Ishlatilishi:
    python -m backup save                 # yangi backup yaratadi
    python -m backup list                 # mavjud backuplarni ko'rsatadi
    python -m backup restore <fayl_nomi>   # tanlangan backupni tiklaydi
    python -m backup restore --latest      # eng so'nggi backupni tiklaydi
"""

import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "dictionary.db"
BACKUP_DIR = ROOT / "backups"


def save() -> Path:
    if not DB_PATH.exists():
        raise SystemExit(f"{DB_PATH} topilmadi - avval baza yaratilishi kerak")

    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    dest = BACKUP_DIR / f"dictionary_{stamp}.db"
    shutil.copy2(DB_PATH, dest)
    print(f"backup yaratildi: {dest}")
    return dest


def list_backups() -> list[Path]:
    if not BACKUP_DIR.exists():
        return []
    backups = sorted(BACKUP_DIR.glob("dictionary_*.db"))
    for b in backups:
        print(b.name)
    return backups


def restore(name: str) -> None:
    backups = sorted(BACKUP_DIR.glob("dictionary_*.db"))
    if not backups:
        raise SystemExit("hech qanday backup topilmadi")

    if name == "--latest":
        target = backups[-1]
    else:
        target = BACKUP_DIR / name
        if not target.exists():
            raise SystemExit(f"{target} topilmadi")

    if DB_PATH.exists():
        # tiklashdan oldin joriy holatni ham yo'qotmaslik uchun saqlab qo'yamiz
        safety = save()
        print(f"(joriy holat tiklashdan oldin saqlandi: {safety.name})")

    shutil.copy2(target, DB_PATH)
    print(f"tiklandi: {target} -> {DB_PATH}")


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)

    command = sys.argv[1]
    if command == "save":
        save()
    elif command == "list":
        list_backups()
    elif command == "restore":
        if len(sys.argv) < 3:
            raise SystemExit("fayl nomi yoki --latest ko'rsating")
        restore(sys.argv[2])
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
