# 4000 Words | Assets uploader

[Asosiy bo'lim](https://github.com/aliendevuz/words)

Bu bo'lim **faqat bitta vazifaga javobgar**: rootdagi [`../assets`](../assets) papkasini (ilova o'qiydigan yagona ishonchli manba) Cloudflare R2'ga to'g'ri, izchil holda yuklash va shu yuklashni tekshirish.

So'z/lug'at ma'lumotlarini tayyorlash, CSV'lardan JSON generatsiya qilish va shunga o'xshash ish esa bu yerda emas, [`../data-preprocessing`](../data-preprocessing) papkasida.

## Tezkor boshlash

```bash
cd upload
bun install        # yoki: npm install
cp .env.example .env   # (.env.example yo'q bo'lsa pastdagi jadvalga qarang)
# .env'ni to'ldiring, keyin:
node upr2.js
```

## `.env`

| O'zgaruvchi | Majburiymi | Tavsif |
|---|---|---|
| `R2_ENDPOINT` | ✅ | `https://<account-id>.r2.cloudflarestorage.com` — Cloudflare dashboard → R2 → bucket → **S3 API** |
| `R2_ACCESS_KEY_ID` | ✅ | R2 → **Manage R2 API Tokens** → Create API Token |
| `R2_SECRET_ACCESS_KEY` | ✅ | Yuqoridagi token bilan birga bir marta ko'rsatiladi — darhol saqlab qo'ying |
| `R2_BUCKET` | ✅ | Bucket nomi (standart: `words`) |
| `UPLOAD_CONCURRENCY` | ❌ | Parallel yuklanadigan fayllar soni (standart: `24`) |
| `UPLOAD_RETRIES` | ❌ | Har bir so'rov (fayl/hash/versiya) necha marta qayta urinishi (standart: `3`) |
| `UPLOAD_RETRY_DELAY_MS` | ❌ | Qayta urinishlar orasidagi boshlang'ich kutish, eksponensial o'sadi (standart: `500`) |
| `UPLOAD_VERBOSE` | ❌ | `1` bo'lsa, har bir fayl uchun batafsil log chiqadi |
| `UPLOAD_FORCE` | ❌ | `1` bo'lsa (yoki `--force` flag), o'zgarmagan fayllar ham majburan qayta yuklanadi |

`.env` `.gitignore`da — hech qachon commit qilinmaydi.

## Skriptlar

### `upr2.js` — asosiy yuklovchi (Cloudflare R2)

```bash
node upr2.js
```

`../assets` papkasidagi **barcha** fayllarni skanerlab, har biri uchun:
1. Fayl **o'zgarmagan bo'lsa** (mtime oxirgi muvaffaqiyatli yuklashdagi bilan bir xil — `.v/<fayl>` orqali tekshiriladi) — **butunlay o'tkazib yuboriladi**. Shu bilan qayta ishga tushirishlar juda tez bo'ladi va R2'ga keraksiz so'rov yuborilmaydi.
2. O'zgargan (yoki hali umuman yuklanmagan) fayllar uchun: faylning o'zi R2'ga yuklanadi (`Key` = `assets/`ga nisbatan yo'l), so'ng `.v/<fayl>` (mtime — versiya belgisi) va `.hash/<fayl>.sha256` (SHA-256) ham yangilanib yuklanadi.

Barcha fayllarni (o'zgarmaganlarini ham) majburan qayta yuklash uchun: `UPLOAD_FORCE=1 node upr2.js` yoki `node upr2.js --force`.

Tarmoq xatosi bo'lgan har bir so'rov **avtomatik `UPLOAD_RETRIES` marta qayta uriniladi** (eksponensial kutish bilan). Oxirida qaysi fayllar muvaffaqiyatsiz bo'lganini **aniq ro'yxat** qilib ko'rsatadi va shunday holatda process **1-kod bilan chiqadi** (CI/avtomatlashtirish uchun muhim — endi xato bo'lsa ham "completed successfully" deb yolg'on chiqarmaydi).

Muvaffaqiyatsiz bo'lgan alohida faylni butun 6800+ faylni qayta skanerlamasdan tuzatish uchun:

```bash
node retry-file.js en/essential/picture/0/8/11.jpg
```

### `prepare.js` — lokal versiya/hash'larni oldindan hisoblash

```bash
node prepare.js
```

Hech narsani yuklamaydi — faqat `.v/` va `.hash/` fayllarini lokal ravishda yangilaydi (CRLF→LF normalizatsiya bilan). Katta upload oldidan tekshirish yoki debug uchun foydali.

### `retry-file.js` — bitta faylni qayta yuklash

```bash
node retry-file.js <assets/ ga nisbatan yo'l>
# masalan:
node retry-file.js en/essential/words.json
```

`upr2.js` bilan bir xil mantiq (fayl + hash + versiya), lekin faqat bitta fayl uchun — to'liq upload'dan keyin tasodifiy tarmoq xatosi chiqqan holatlar uchun.

### `check.js` — bitta faylni masofadan tekshirish

```bash
node check.js
```

`fileUrl`/`hashUrl`ni faylning o'zida o'zgartirib, ma'lum bir fayl R2'da buzilmaganini (lokal hisoblangan SHA-256 bilan `.hash/*.sha256`ni solishtirib) tasdiqlaydi.

### `compare-hashes.js` — eski AWS S3 va R2'ni solishtirish (bir martalik diagnostika)

```bash
node compare-hashes.js
```

Faqat R2'ga o'tish migratsiyasi paytida ishlatilgan — `words.json`ning eski S3 (`assets.4000.uz`) va yangi R2 nusxalarini bayt-bayt solishtiradi. Hozir **kerak emas** (production allaqachon R2'da, `android-old`dagi `BASE_URL` shuni tasdiqlaydi), lekin kelajakda shunga o'xshash migratsiya kerak bo'lsa namuna sifatida qoldirilgan.

### `up.js` — eski AWS S3 yuklovchi (ishlatilmayapti)

Hozirgi production R2'dan foydalanadi (`upr2.js`), bu skript legacy — faqat tarixiy sabablarga ko'ra saqlanmoqda.

## Muhim eslatmalar

- **`upr2.js` haqiqiy foydalanuvchilarga ta'sir qiladigan production amal** — `../assets` ichidagi hamma narsani CDN'ga yozadi. Ishga tushirishdan oldin `../assets` to'g'ri holatda ekanini tekshiring.
- Yagona ishonchli manba — rootdagi **`../assets`** papkasi. `../data-preprocessing/dataset*.json` esa CSV'dan generatsiya qilingan oraliq nusxalar, ular avtomatik `../assets`ga ko'chirilmaydi — o'zgartirish qilsangiz ikkalasini ham qo'lda yangilang (yoki shunga mos skript yozing).
- `.ignore` — versiyalash/hash'dan butunlay chetlab o'tiladigan papkalar. `.fignore` — faqat hash/versiya metadata'dan chetlab o'tiladigan (lekin baribir yuklanadigan) fayllar. Ikkalasi ham hozir **bo'sh** — barcha fayllar (rasm/audio ham) versiya kuzatuviga kiritilgan, shuning uchun o'zgarmagan fayllar avtomatik skip qilinadi.
