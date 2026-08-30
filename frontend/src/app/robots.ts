import type { MetadataRoute } from "next";

import { SITE } from "@/lib/config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // AppLinks fallback sahifalari — ilova uchun, qidiruv uchun emas.
        disallow: ["/next/", "/lesson/", "/test/", "/downloads/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
