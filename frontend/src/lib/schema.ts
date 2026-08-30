import { ANDROID, APP, SITE } from "@/lib/config";
import { FAQ } from "@/lib/faq";

/**
 * Google qidiruvda ilova kartochkasini reyting va narx bilan ko'rsatishi
 * uchun MobileApplication sxemasi.
 */
export function appSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: APP.name,
    alternateName: ["4000 Words", "Essential English", "4000 so'z"],
    description: SITE.description,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Android",
    inLanguage: ["uz", "en"],
    url: SITE.url,
    installUrl: ANDROID.playStoreUrl,
    downloadUrl: ANDROID.playStoreUrl,
    author: { "@type": "Person", name: APP.developer },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "UZS",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: APP.ratingValue,
      ratingCount: APP.reviews,
      bestRating: 5,
      worstRating: 1,
    },
    contentRating: APP.contentRating,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: SITE.lang,
    description: SITE.description,
    publisher: { "@type": "Person", name: APP.developer },
  };
}

/**
 * Qidiruvda "Odamlar shuni ham so'raydi" bloki uchun.
 * Savollar o'zbek foydalanuvchilar haqiqatda qidiradigan shaklda.
 */
export function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
