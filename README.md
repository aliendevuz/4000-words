# 4000 Words

Ingliz tilini o'rganayotgan o'zbek tilida so'zlashuvchilar uchun so'z boyligi
platformasi. «4000 Essential English Words» kitobi asosida tuzilgan: har bir
so'z o'zbekcha tarjimasi, talaffuzi va hayotiy misollar bilan beriladi,
hikoyalar va testlar bilan mustahkamlanadi.

- **Ilova:** [Google Play](https://play.google.com/store/apps/details?id=uz.alien.dictup) — 5 ming+ yuklanma, 4,8 reyting
- **Sayt:** [4000.uz](https://4000.uz)

## Monorepo

Loyiha ilgari alohida repozitoriylarda edi (`words-android`, `words-frontend`,
`words-upload`). Endi hammasi bitta repozitoriyga birlashtirildi.

Sabab: Android ilova va veb-sayt bir xil kontent ustida ishlaydi, ranglar va
brend elementlari ham umumiy. Alohida repolarda bir tomondagi o'zgarishni
ikkinchisiga ko'chirish qo'lbola ish edi — bitta workspace'da ikkalasi ham
ko'z oldida turadi.

## Bo'limlar

| Papka | Nima | Holat |
|---|---|---|
| [`android/`](android/) | Android ilova | Ishlab chiqilmoqda |
| [`frontend/`](frontend/) | 4000.uz sayti | Vizitka sifatida ishlayapti |
| `android-old/`, `frontend-old/` | Oldingi versiyalar | Arxiv |
| Qolganlari | Ichki vositalar | Publishingga tayyor emas |

Play Store'da hozir `android-old/` dagi versiya turibdi (v5.2.0).

### `android/`

Kotlin + Jetpack Compose + Material 3. AppLinks orqali sayt havolalari
ilovada ochiladi.

`minSdk 24`, `targetSdk 37`.

### `frontend/`

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, static export.

Hozircha ilovaning taqdimot sahifasi vazifasini bajaradi: imkoniyatlar, FAQ va
Google Play havolasi. Qidiruv uchun optimallashtirilgan — ilovani
"essential english words o'zbekcha" kabi so'rovlar orqali topish uchun.

Ranglar Android ilovaning logotipidan olingan
(`android/app/src/main/res/values/colors.xml`).

Batafsil: [`frontend/README.md`](frontend/README.md)

## Kontent

So'zlar, hikoyalar, rasm va audio fayllar Cloudflare R2 ga chiqarilgan —
`assets.4000.uz`. Ilova ham, sayt ham shu manbadan foydalanadi; kontentning
o'zi repozitoriyda saqlanmaydi.

Ikki to'plam: `essential` (3600 so'z, 6 daraja) va `beginner` (1600 so'z,
4 daraja).

## Muallif

Ibrohim Xalilov
