import type { Metadata } from "next";

import { AppLinkFallback } from "@/components/AppLinkFallback";

// Eski /downloads manzili Play Store'ga darhol yo'naltirar edi — o'sha
// xatti-harakat saqlanadi, indekslanadigan nusxasi esa /download.
export const metadata: Metadata = {
  title: "Ilovani yuklab olish",
  robots: { index: false, follow: true },
  alternates: { canonical: "/download/" },
};

export default function DownloadsPage() {
  return (
    <AppLinkFallback
      title="4000 Words ilovasi"
      description="Google Play sahifasiga yo'naltirilmoqda…"
      auto
    />
  );
}
