# Tarqatish (distribution) modeli

Eski uslub: `upload/*.js` orqali JSON fayllarni to'g'ridan-to'g'ri R2'ga yuklash, client JSON'ni to'liq yuklab olardi. Yangi uslub: R2'ga yuklash mexanizmi o'zgarmaydi, lekin **nima yuklanishi** butunlay o'zgaradi — na xom JSON, na `dictionary.db`ning o'zi tarqatilmaydi. Buning o'rniga: minimal (ortiqcha belgisiz) format + arxivlash + chapter darajasida qismlarga bo'lish + hash asosida faqat o'zgarganini yuklash.

## Nega na JSON, na `dictionary.db`?

- JSON — har bir yozuvda `"word":`, `"definition":` kabi kalit nomlari qaytarilib, hajmni behuda oshiradi
- `dictionary.db` — butun baza (ichki jadvallar, indekslar, `deprecated`/`replaced_by` kabi faqat bizga kerakli boshqaruv ustunlari) — clientga kerak bo'lmagan narsalarni ham tashiydi, va qisman yangilash imkonini bermaydi

## Format: header'siz CSV/TSV

Har bir qism (`.data` fayl) — ustun nomlarisiz, faqat qatorlar. Ustun tartibi **bitta joyda**, `schema.json`da versiyalanadi, har qatorda takrorlanmaydi. 3 ta platforma (Kotlin/Android, Rust/Tauri desktop, JS/TS) uchun ham qo'shimcha kutubxona kerak emas.

```
1,afraid,17,əˈfreid
When someone is afraid, they feel fear.
→ The woman was afraid of what she saw.
```

## Qismlarga bo'lish: chapter darajasida

Eng kichik yangilanadigan birlik — **chapter** (bob). Agar faqat "Beginner 1-bob"da xatolik tuzatilsa, faqat o'sha bobning fayli qayta yuklanadi, qolganlariga tegilmaydi.

```
dist/
└── v{format_version}/                     # tarqatish format versiyasi (DB migratsiya versiyasidan ALOHIDA)
    ├── manifest.json                        # barcha qismlar + hash + hajm - client birinchi shuni yuklaydi
    ├── schema.json                           # ustun tartibi (part turi bo'yicha)
    ├── beginner/
    │   ├── chapter-1.data.gz + .sha256
    │   ├── chapter-2.data.gz + .sha256
    │   └── ...
    ├── essential/
    │   ├── chapter-1.data.gz + .sha256
    │   └── ...
    └── stories/
        ├── beginner-chapter-1.data.gz + .sha256   (beginner'da hikoya yo'q - bo'sh/mavjud emas)
        └── essential-chapter-1.data.gz + .sha256
```

Har bir `chapter-N.data` shu bobga tegishli: `units`, `unit_words`, `words`, `word_types`, `definitions`, `samples`, `vocabularies`, `word_pictures` — barchasi shu bob doirasida.

`stories/*.data` alohida, chunki endi `stories.unit_id` orqali unit'ga bog'langan (quyida) — shuning uchun ham chapter darajasida bo'lish mumkin.

## `format_version` vs DB migratsiya versiyasi

Ikkalasi ATAYLAB ajratilgan:
- Alembic migratsiya versiyasi — ichki, har safar ustun qo'shilganda o'zgaradi (masalan `vocabularies.deprecated`)
- `format_version` — faqat **tarqatiladigan maydonlar to'plami** o'zgarsa oshiriladi

Shu bilan eski ilova versiyalari eski `v{format_version}`ni, yangi ilova versiyalari yangisini olishda davom etadi (backward compatibility). Har bir `v{format_version}` papkasi generatsiya qilinganda saqlanib qoladi (eski clientlar ishlashda davom etishi uchun).

## Yangilanish oqimi (client)

1. `manifest.json`ni yuklaydi (juda kichik)
2. Har bir qismning hash'ini lokal saqlangan hash bilan solishtiradi
3. Faqat **o'zgargan** qismlarni yuklaydi, `.sha256` bilan tekshiradi, `.gz`ni ochadi
4. `schema.json` bo'yicha o'z lokal bazasiga joylaydi (shu chapter/bob doirasida **full-replace** — append emas, chunki ID'lar barqaror bo'lsa ham, o'chirilgan/o'zgargan yozuvlar bo'lishi mumkin)

## `stories.unit_id` — yangi bog'lanish

Avval `stories` jadvalida qaysi unit uchun yozilgani saqlanmagan edi (seed paytida yo'qolgan). Tekshirib tasdiqladik: `e-stories.json` va `e-words.json` bir xil tartibda (group 0→5, subgroup 0→29) flatten qilingani uchun **N-chi hikoya = N-chi unit** pozitsion mos keladi (6×30=180=180, aniq bittalik moslik). 4 nuqtada (1, 2, 90, 180-pozitsiya) unit so'zlari va hikoya matni solishtirilib, 18-20/20 so'z mosligi bilan tasdiqlandi.

Shu asosda `stories.unit_id` (FK -> `units.id`, nullable — beginner'da hikoya yo'q) qo'shildi va backfill qilindi (migratsiya: `1be3e928da03_add_stories_unit_id`). Endi `stories/*.data` ham chapter darajasida to'g'ri bo'linadi.

## Hozirgi holat

- [x] `stories.unit_id` sxemaga qo'shildi va backfill qilindi
- [ ] Eksport skripti (`dictionary.db` → `dist/v1/...`) hali yozilmagan
- [ ] `manifest.json`/`schema.json` generatori hali yozilmagan
- [ ] R2'ga yuklash logikasi (eski `upr2.js` mantig'iga o'xshash, lekin yangi fayl tuzilmasiga moslashtirilgan) hali yozilmagan
