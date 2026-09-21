# assets — 4000 Words lug'at bazasi

Ingliz tili lug'atini (so'z, talaffuz, ta'rif, misol, rasm, tarjima, hikoya) SQLite baza va FastAPI orqali boshqarish uchun loyiha. Eski JSON/papka asosidagi tuzilma (`assets-old/`) o'rniga keldi.

## Tuzilma

```
assets/
├── app/
│   ├── models.py       # SQLAlchemy modellari (database.md'ga mos)
│   ├── database.py      # engine / session
│   ├── schemas.py        # Pydantic response modellari
│   └── main.py            # FastAPI ilovasi (endpointlar)
├── alembic/                # migratsiyalar
├── tests/test.http          # so'rovlarni qo'lda sinash uchun (.http)
├── api.http                  # xuddi shu, qisqartirilgan namuna
├── docs/database.md            # sxema hujjati (jadval-jadval, izohlar bilan)
├── backup.py                   # dictionary.db uchun backup/restore skripti
├── requirements.txt
├── dictionary.db                # SQLite baza (gitignored)
├── storage/pictures/              # so'z rasmlari (gitignored, 96M)
└── backups/                        # dictionary.db nusxalari (gitignored)
```

`.venv`, `storage/`, `dictionary.db`, `backups/` — barchasi `.gitignore`da, GitHub'ga chiqmaydi.

## Sxema

To'liq sxema tavsifi: [`docs/database.md`](docs/database.md). Qisqacha:

- `languages`, `types` — asosiy lug'atlar
- `words` — faqat headword (yozilishi), til bo'yicha
- `word_types` — so'zning bitta turi/ma'nosi (tur + talaffuz); bitta so'z bir nechta turga ega bo'lishi mumkin (masalan "update" noun/verb)
- `definitions`, `samples` — `word_type`ga 1:N (bitta so'z+tur bir nechta ta'rif/misolga ega bo'lishi mumkin)
- `vocabularies` — ikki tildagi `word_type`larni bog'laydi (M:N, sinonim tarjimalarga ruxsat beradi); `deprecated`/`replaced_by` orqali sifatsiz tarjimalarni yo'qotmasdan tuzatish mumkin
- `courses` → `chapters` → `units` → `unit_words` — o'quv dasturi tuzilmasi (Beginner, Essential)
- `stories`, `used_words` — hikoyalar
- `word_pictures`, `course_pictures`, `chapter_pictures`, `unit_pictures`, `story_pictures` — rasm bog'lanishlari

## O'rnatish

```bash
cd assets
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt
```

## Migratsiya

```bash
./.venv/Scripts/python -m alembic upgrade head
```

> **Diqqat:** `seed.py` va xom JSON manba fayllari olib tashlangan. `dictionary.db` — yagona manba; uni JSON'dan qayta yaratadigan avtomatik yo'l yo'q, shuning uchun har qanday qo'lda tuzatish faqat `backup.py` orqali muhofaza qilinadi.

## Backup

```bash
./.venv/Scripts/python backup.py save              # yangi backup
./.venv/Scripts/python backup.py list                # mavjud backuplar
./.venv/Scripts/python backup.py restore --latest      # eng so'nggisini tiklash
```

Bazaga qo'lda tuzatish kiritishdan oldin doim `backup.py save` ishga tushiring.

## API'ni ishga tushirish

```bash
./.venv/Scripts/python -m uvicorn app.main:app --reload
```

Swagger UI: `http://127.0.0.1:8000/docs`. So'rovlarni sinash uchun `tests/test.http` yoki `api.http` fayllaridan foydalaning (VSCode REST Client / JetBrains HTTP Client).

### Asosiy endpointlar

| Endpoint | Tavsif |
|---|---|
| `GET /languages` | til ro'yxati |
| `GET /words?q=&language=&limit=&offset=` | so'z qidirish |
| `GET /words/{id}` | bitta so'z, to'liq ma'lumot bilan |
| `GET /get_vocab?id=0..5199` | vocabularies jadvalidan 0-based indeks bo'yicha to'liq yozuv (from/to so'z, ta'rif, misol, talaffuz) |
| `GET /courses`, `/courses/{id}/chapters`, `/chapters/{id}/units`, `/units/{id}/words` | o'quv dasturi bo'yicha navigatsiya |
| `GET /stories`, `/stories/{id}` | hikoyalar |

## Holat

- Inglizcha va o'zbekcha lug'at, o'quv dasturi tuzilmasi, hikoyalar va rasm bog'lanishlari `dictionary.db`da to'liq mavjud
- O'zbekcha tarjimalar sifati hali to'liq tekshirilmagan (avtomatik/past aniqlikdagi manbadan); xato topilganda yangi (to'g'ri) `vocabularies` yozuvi qo'shilib, eskisi `deprecated=true` qilinadi va `replaced_by` orqali yangisiga bog'lanadi
- `used_words`, `story_translations`, `course_pictures`, `chapter_pictures`, `unit_pictures`, `story_pictures` — hali bo'sh (manba yo'q)
