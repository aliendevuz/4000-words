# TODO

Bugungi ishning yakuni va keyingi safar davom etadigan nuqta. Batafsil kontekst: [`README.md`](README.md), [`docs/database.md`](docs/database.md), [`docs/schema.md`](docs/schema.md), [`docs/distribution.md`](docs/distribution.md), [`docs/import.md`](docs/import.md).

## Bugun qilingan ishlar

- Eski JSON/papka asosidagi `assets-old` tuzilmasi o'rniga normallashtirilgan SQLite sxema (`dictionary.db`) + Alembic migratsiyalari qurildi
- Inglizcha va o'zbekcha lug'at (words/word_types/definitions/samples/vocabularies), o'quv dasturi (courses/chapters/units/unit_words), hikoyalar (stories, endi `unit_id` bilan bog'langan), rasm bog'lanishlari (word_pictures) seed qilindi
- `vocabularies.deprecated`/`replaced_by` orqali tarjima xatolarini yo'qotmasdan tuzatish mexanizmi qo'shildi va sinovdan o'tkazildi (`absurd` misolida)
- FastAPI o'qish (read-only) API'si yozildi (`/words`, `/get_vocab`, `/courses`, `/stories`, ...), `tests/test.http` bilan sinovdan o'tkazildi
- `backup.py` — `dictionary.db` uchun backup/restore skripti
- `dist.py` — bazani chapter-darajasida bo'lingan, gzip siqilgan, hash bilan tasdiqlangan `dist/v1/` paketiga eksport qiladi (2.27 MB baza -> 0.70 MB, ~69% tejash)
- `docs/import.md` — client tomonida `dist/`ni ochib bazaga joylashtirish qo'llanmasi

## Keyingi safar (ustuvorlik tartibida emas, kerak bo'lganda tanlanadi)

- [ ] **R2'ga yuklash skripti** — `dist/v{N}/`ni R2'ga yuklaydigan (eski `upr2.js` mantig'iga o'xshash, lekin yangi fayl tuzilmasiga moslashtirilgan, faqat o'zgargan qismlarni qayta yuklaydigan) skript hali yozilmagan
- [ ] **`used_words` to'ldirish** — hikoya matnida qaysi so'zlar ishlatilganini avtomatik aniqlab (matn tahlili) to'ldirish mumkin, hozircha bo'sh
- [ ] **O'zbekcha tarjima sifatini tekshirish** — `vocabularies` avtomatik/tekshirilmagan manbadan seed qilingan, xato topilgan sayin `deprecated=true` + yangi to'g'irlangan yozuv orqali tuzatiladi (jarayon `absurd` misolida sinovdan o'tgan, lekin ommaviy tekshiruv hali qilinmagan)
- [ ] **`dist.py`da o'chirilgan qatorlarni xabar qilish** — hozircha manifest faqat "bor/o'zgargan" qismlarni bildiradi, agar biror so'z/hikoya butunlay o'chirilsa, client buni bilmaydi (`docs/import.md` 5-bo'limida eslatilgan)
- [ ] **FastAPI'ni to'liq CMS/admin darajasiga olib chiqish** — hozir faqat o'qish (GET) uchun; kelajakda: yozish endpointlari (so'z/tarjima qo'shish, `deprecated` belgilash), autentifikatsiya, va veb interfeys orqali boshqarish (hozircha kerak emas deb qaror qilindi)
- [ ] **`story_pictures`, `course_pictures`, `chapter_pictures`, `unit_pictures`** — jadvallar bor, lekin manba yo'qligi sababli bo'sh
- [ ] **`dist.py` fayl nomlash** — `chapter-N` dagi N hozircha 0-based `order` qiymati (masalan `chapter-0`), inson uchun 1-based (`chapter-1`) qilib ko'rsatish kerak bo'lishi mumkin

## Eslatmalar

- Xom JSON manba fayllari (`b-words.json` va h.k.) ataylab o'chirilgan — `dictionary.db` yagona manba, uni **hech qachon** qayta seed qilib bo'lmaydi. Har qanday o'zgarishdan oldin `backup.py save` ishlatilsin.
- `assets-old/` ham diskdan yo'qolgan — tiklab bo'lmaydi, faqat `dictionary.db` va uning backuplariga tayaniladi.
