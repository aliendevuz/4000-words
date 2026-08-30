# 4000 Words — Website

[4000.uz](https://4000.uz) sayti.

Hozircha vizitka sifatida xizmat qiladi: Android ilovaning taqdimot sahifasi
+ AppLinks fallback sahifalari.

## Stack

- **Next.js 16** (App Router) + `output: "export"` — natija toza statik fayllar
- **TypeScript**, **Tailwind CSS 4**
- Light/dark — tizim sozlamasiga qarab (`prefers-color-scheme`)
- Telegram Mini App qatlami tayyor (sayt Telegram ichida ochilsa moslashadi)

## Ishga tushirish

```bash
bun install
bun run dev      # http://localhost:3000
bun run build    # natija: out/
bun run lint
```

## Sahifalar

| Manzil | Nima |
|---|---|
| `/` | Ilova taqdimoti: statistika, imkoniyatlar, FAQ |
| `/next`, `/lesson`, `/test` | AppLinks fallback (qidiruvda indekslanmaydi) |
| `/download` | Qisqa yuklab olish sahifasi (indekslanadi) |
| `/downloads` | Eski manzil — Play Store'ga yo'naltiradi |

### AppLinks

`/next`, `/lesson`, `/test`, `/download`, `/downloads` manzillari Android
ilovada ochilishi kerak. Ilova o'rnatilmagan bo'lsa brauzer shu sahifalarni
ko'rsatadi va Google Play'ga yo'naltiradi.

`public/.well-known/assetlinks.json` — AppLinks ishlashi uchun **majburiy**.
Bu faylni o'chirmang yoki o'zgartirmang: Play Store'dagi ilovaning havolalari
shunga bog'liq.

## SEO

Sayt ilovani qidiruvdan topish uchun optimallashtirilgan:

- **Metadata** — title, description, keywords (`src/lib/config.ts` → `KEYWORDS`),
  canonical, OpenGraph. Kalit so'zlar o'zbek foydalanuvchilar qidiradigan
  shakllarda: lotin va kirill, apostrofli va apostrofsiz.
- **schema.org** (`src/lib/schema.ts`):
  - `MobileApplication` — reyting, sharhlar soni, narx. Google qidiruvda
    ilova kartochkasini shu ma'lumot bilan ko'rsatadi.
  - `FAQPage` — "Odamlar shuni ham so'raydi" bloki uchun.
  - `WebSite`
- **FAQ** — `src/lib/faq.ts` da bir joyda. Sahifada ko'rinadigan matn va
  schema bir manbadan olinadi: Google strukturalangan ma'lumot sahifadagi
  matnga mos bo'lishini talab qiladi.
- **sitemap.xml**, **robots.txt** — AppLinks sahifalari `Disallow` da.
- Kontent statik HTML'da: JavaScriptsiz ham to'liq o'qiladi.

Ilova statistikasi (`src/lib/config.ts` → `APP`) Play Store'dan qo'lda
olingan — vaqti-vaqti bilan yangilab turing.

## Deploy

`bun run build` → `out/` papkasini statik hostingga qo'ying (~1.2MB).
