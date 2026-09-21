# TODO

Ishning yakuni va keyingi safar davom etadigan nuqta. Batafsil kontekst: [`README.md`](README.md), [`docs/database.md`](docs/database.md), [`docs/schema.md`](docs/schema.md), [`docs/distribution.md`](docs/distribution.md), [`docs/import.md`](docs/import.md).

## Qilingan ishlar

- Eski JSON/papka asosidagi `assets-old` tuzilmasi o'rniga normallashtirilgan SQLite sxema (`dictionary.db`) + Alembic migratsiyalari qurildi
- Inglizcha va o'zbekcha lug'at (words/word_types/definitions/samples/vocabularies), o'quv dasturi (courses/chapters/units/unit_words), hikoyalar (stories, `unit_id` bilan bog'langan), so'z rasm bog'lanishlari (word_pictures) seed qilindi
- `vocabularies.deprecated`/`replaced_by` orqali tarjima xatolarini yo'qotmasdan tuzatish mexanizmi qo'shildi va sinovdan o'tkazildi (`absurd` misolida)
- FastAPI o'qish (read-only) API'si yozildi (`/words`, `/get_vocab`, `/courses`, `/stories`, ...), `tests/test.http` bilan sinovdan o'tkazildi
- `backup.py` — `dictionary.db` uchun backup/restore skripti
- `dist.py` — bazani chapter-darajasida bo'lingan, gzip siqilgan, hash bilan tasdiqlangan `dist/v1/` paketiga eksport qiladi (~2.27 MB baza -> ~0.68 MB, ~70% tejash)
- `up.py` — `dist/`, so'z rasmlari (`storage/pictures/*` -> R2'da `pictures/{word_type_id}.jpg`, ALOHIDA-ALOHIDA, zip/bundle YO'Q) va bob muqovalari (`storage/chapters/*` -> `chapters/{chapter_id}.{ext}`) R2'ga sinxronlanadi, o'zgarmagan fayllar qayta yuklanmaydi — **haqiqiy yuklash bajarildi, R2'da live**
- `chapters.background_color` qo'shildi (eski Android ilovasi `colors.xml`sidan tiklandi) — muqova rasmlari shaffof, shu rangni fon sifatida ishlatish kerak
- `chapter_pictures` (10 ta: Beginner 1-4, Essential 1-6) `android-old`dan tiklab to'ldirildi
- `docs/import.md` — client tomonida `dist/`ni ochib bazaga joylashtirish, rasm/chapter-rang URL konvensiyasi bo'yicha to'liq qo'llanma

## Keyingi safar (ustuvorlik tartibida emas, kerak bo'lganda tanlanadi)

- [ ] **`used_words` to'ldirish** — hikoya matnida qaysi so'zlar ishlatilganini avtomatik aniqlab (matn tahlili) to'ldirish mumkin, hozircha bo'sh
- [ ] **O'zbekcha tarjima sifatini tekshirish** — `vocabularies` avtomatik/tekshirilmagan manbadan seed qilingan, xato topilgan sayin `deprecated=true` + yangi to'g'irlangan yozuv orqali tuzatiladi (jarayon `absurd` misolida sinovdan o'tgan, lekin ommaviy tekshiruv hali qilinmagan)
- [ ] **`dist.py`da o'chirilgan qatorlarni xabar qilish** — hozircha manifest faqat "bor/o'zgargan" qismlarni bildiradi, agar biror so'z/hikoya butunlay o'chirilsa, client buni bilmaydi (`docs/import.md` 5-bo'limida eslatilgan)
- [ ] **FastAPI'ni to'liq CMS/admin darajasiga olib chiqish** — hozir faqat o'qish (GET) uchun; kelajakda: yozish endpointlari (so'z/tarjima qo'shish, `deprecated` belgilash), autentifikatsiya, va veb interfeys orqali boshqarish (hozircha kerak emas deb qaror qilindi)
- [ ] **`story_pictures`, `course_pictures`, `unit_pictures`** — jadvallar bor, lekin manba yo'qligi sababli bo'sh (`chapter_pictures` endi to'ldirilgan)
- [ ] **`dist.py` fayl nomlash** — `chapter-N` dagi N hozircha 0-based `order` qiymati (masalan `chapter-0`), inson uchun 1-based (`chapter-1`) qilib ko'rsatish kerak bo'lishi mumkin
- [ ] **`R2_PUBLIC_BASE`** — client uchun rasm/chapter URL bazasi (`https://pub-....r2.dev/`) hech qayerda hujjatlashtirilmagan/konfiguratsiya sifatida saqlanmagan, kerak bo'lsa `.env.example`/`docs/import.md`ga aniq yozib qo'yish kerak

## Eslatmalar

- Xom JSON manba fayllari (`b-words.json` va h.k.) ataylab o'chirilgan — `dictionary.db` yagona manba, uni **hech qachon** qayta seed qilib bo'lmaydi. Har qanday o'zgarishdan oldin `backup.py save` ishlatilsin.
- `assets-old/` ham diskdan yo'qolgan — tiklab bo'lmaydi, faqat `dictionary.db` va uning backuplariga tayaniladi.
- `android-old/` hali kerak — undan chapter rasm/rang kabi metadata tiklandi, kelajakda yana kerak bo'lishi mumkin (o'chirmang).
- R2'da hozir **haqiqiy production data** bor (`dist/v1/`, `pictures/`, `chapters/`) — `dist.py`/`up.py`ni ishga tushirishdan oldin sxema o'zgarishi client'larga mos kelishini tekshiring (`format_version` mantig'iga qarang).
