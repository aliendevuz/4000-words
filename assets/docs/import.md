# Import qo'llanmasi — dist paketini clientda bazaga joylashtirish

Bu hujjat `dist.py` chiqargan `dist/v{N}/` paketini (Android/Desktop) client tomonida qanday ochib, o'z lokal bazasiga to'g'ri joylashtirish kerakligini tasvirlaydi. Server tomoni (`dist.py`) haqida: [`distribution.md`](distribution.md).

## 1. Fayl tuzilmasi (nimani yuklab olasiz)

```
dist/v1/
├── manifest.json          # barcha qismlar ro'yxati: path, sha256, raw_bytes, gz_bytes
├── schema.json              # har bir jadval uchun ustun tartibi (bir marta, hamma .data uchun umumiy)
├── common.data.gz             # languages, types, courses, chapters (kichik, har doim to'liq yuklanadi)
├── beginner/
│   ├── chapter-0.data.gz + .sha256
│   ├── chapter-1.data.gz + .sha256
│   └── ...
└── essential/
    ├── chapter-0.data.gz + .sha256
    └── ...
```

`chapter-N` dagi `N` — bobning `order` qiymati (0-based), ko'rsatiladigan raqam emas.

## 2. Yuklab olish oqimi

1. `manifest.json`ni yuklab oling (juda kichik, har doim).
2. Har bir `parts[].path` uchun: lokalda avval saqlangan `sha256`ni solishtiring.
   - Mos kelsa — o'sha qismni **qayta yuklamang**, o'tkazib yuboring.
   - Mos kelmasa (yoki lokalda umuman yo'q) — o'sha `path`ni yuklab oling.
3. Yuklangan har bir faylning `sha256`sini qayta hisoblab, `manifest.json`dagi qiymat bilan solishtiring (transport buzilishini aniqlash uchun). Mos kelmasa — qismni qayta yuklang, saqlamang.
4. Muvaffaqiyatli tekshirilgan har bir qism uchun uning `sha256`sini lokal "oxirgi sinxronlangan holat" jadvalingizga yozib qo'ying (keyingi safar solishtirish uchun).

## 3. `.data.gz` faylni ochish

Har bir fayl **gzip** bilan siqilgan — avval standart gzip decompress qiling. Ichidagi matn — oddiy UTF-8.

Format: bitta faylda bir nechta jadval bo'lishi mumkin, har biri `#jadval_nomi` qatori bilan boshlanadi, undan keyingi qatorlar — shu jadvalning **header'siz CSV** qatorlari (RFC4180 quoting: qiymat ichida vergul/tirnoq/yangi qator bo'lsa, qo'shtirnoq bilan o'ralgan va ichidagi `"` ikki marta yoziladi — standart CSV kutubxonangiz buni avtomatik tushunadi).

```
#units
111,Essential 2.1,,6,0
112,Essential 2.2,,6,1
#unit_words
501,111,4641,0
...
#word_types
4641,3811,17,əbˈsəːrd
...
```

Bo'sh qiymat (masalan `description` yo'q bo'lsa) — ikkita vergul orasida hech narsa yo'q (`,,`) — buni `NULL`/`null`/`None` deb talqin qiling, bo'sh satr (`""`) deb emas.

## 4. Ustunlarni aniqlash — `schema.json`

`#jadval_nomi`dan keyingi qatorlardagi ustunlar tartibi `schema.json`dagi shu jadval kaliti ostidagi massivga mos:

```json
{
  "word_types": ["id", "word_id", "type_id", "transcript"],
  "units": ["id", "name", "description", "chapter_id", "order"],
  ...
}
```

Ya'ni yuqoridagi `word_types` misolida: `id=4641, word_id=3811, type_id=17, transcript="əbˈsəːrd"`.

**Muhim:** `schema.json` har bir `format_version` ichida bir marta yuklanadi va o'zgarmaydi — parser ustun sonini/tartibini `.data` faylning o'zidan emas, shu fayldan oladi.

## 5. Lokal bazaga joylashtirish

- Har bir jadval qatorini **`id` bo'yicha upsert** qiling (`INSERT OR REPLACE`/`ON CONFLICT DO UPDATE`) — chunki bitta so'z/word_type bir nechta chapter faylida qayta uchrashi mumkin (masalan tarjima maqsadida boshqa tildagi `word_type` ham shu faylga qo'shib yuborilgan — o'zaro chapter fayllar orasida ID'lar **kesishishi normal holat**, xato emas).
- Bitta chapter qismini import qilganda, o'sha jadvallarni **to'liq almashtirish** shart emas — faqat kelgan qatorlarni upsert qiling. Serverdan o'chirilgan qatorlar hozircha `manifest.json` orqali xabar qilinmaydi (# TODO.md'ga qarang).
- Import tartibi FK bog'liqligiga mos bo'lishi kerak: `languages/types` → `words` → `word_types` → (`definitions`/`samples`/`word_pictures`/`vocabularies`/`unit_words`) → `courses` → `chapters` → `units` → `stories`. Amalda `common.data.gz`ni birinchi, keyin chapter fayllarni istalgan tartibda import qilish yetarli (chapter fayl ichida jadvallar yuqoridagi tartibda allaqachon yozilgan).

## 6. Minimal psevdokod

```
manifest = fetch_json(BASE_URL + "/manifest.json")
schema = fetch_json(BASE_URL + "/schema.json")

for part in manifest.parts:
    if local_hash[part.path] == part.sha256:
        continue  # o'zgarmagan, o'tkazib yuborish

    gz_bytes = fetch_bytes(BASE_URL + "/" + part.path)
    assert sha256(gz_bytes) == part.sha256, "buzilgan fayl"

    text = gunzip(gz_bytes).decode("utf-8")
    for table_name, rows in parse_sections(text):       # "#table" bo'yicha bo'lish
        columns = schema[table_name]
        for row in csv_parse_rows(rows):                 # standart CSV parser
            record = dict(zip(columns, row))
            upsert(local_db, table_name, record)

    local_hash[part.path] = part.sha256                  # sinxronlashni belgilash
```

## 7. Rasmlar (`word_pictures.path`)

`.data` fayllarda faqat **yo'l** (`storage/pictures/0-0-0.jpg`) saqlanadi, rasmning o'zi emas — rasm binary fayllari R2'dan eski usul bo'yicha (o'zgarmagan) alohida yuklanadi, shu `path`ni R2 base URL bilan birlashtirib oling.
