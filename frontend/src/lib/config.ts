/** Loyiha bo'ylab yagona konstantalar. */

export const SITE = {
  url: "https://4000.uz",
  name: "4000 Words",
  title:
    "4000 Words — 4000 Essential English Words o'zbekcha lug'at ilovasi",
  description:
    "«4000 Essential English Words» kitobi asosidagi bepul ilova: inglizcha so'zlarni o'zbekcha tarjimasi, talaffuzi va misollar bilan yodlang. Hikoyalar va testlar bilan mashq qiling.",
  locale: "uz_UZ",
  lang: "uz",
} as const;

/**
 * Qidiruv so'rovlari — o'zbek foydalanuvchilar ilovani qanday izlaydi.
 * Lotin va kirill yozuvi, apostrofli va apostrofsiz shakllar aralash.
 */
export const KEYWORDS = [
  "4000 essential english words o'zbekcha",
  "4000 essential english words uzbek",
  "essential english words tarjimasi",
  "ingliz tili so'z yodlash ilovasi",
  "inglizcha so'zlar o'zbekcha tarjimasi",
  "ingliz tilini o'rganish ilova",
  "inglizcha lug'at yodlash",
  "ingliz tili lug'at ilovasi o'zbek tilida",
  "ingliz tili so'zlari talaffuzi bilan",
  "4000 so'z ingliz tili",
  "english uzbek lug'at",
  "ingliz tili test ilovasi",
  "инглиз тили сўз ёдлаш",
  "инглизча ўзбекча луғат",
] as const;

/** Google Play sahifasidagi ma'lumotlar (oxirgi tekshiruv: 2026-08-30). */
export const APP = {
  name: "4000 Words | Essential English",
  developer: "Ibrohim Xalilov",
  rating: "4,8",
  ratingValue: 4.8,
  reviews: 53,
  installs: "5 ming+",
  contentRating: "3+",
  category: "Ta'lim",
} as const;

export const ANDROID = {
  packageName: "uz.alien.dictup",
  playStoreUrl:
    "https://play.google.com/store/apps/details?id=uz.alien.dictup",
  intentUrl:
    "intent://details?id=uz.alien.dictup#Intent;scheme=market;package=com.android.vending;end",
} as const;
