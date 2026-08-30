import type { Metadata } from "next";

import { AppLinkFallback } from "@/components/AppLinkFallback";

export const metadata: Metadata = {
  title: "Test — 4000 Words ilovasi",
  // AppLinks fallback: ilova uchun, qidiruv natijalari uchun emas.
  robots: { index: false, follow: true },
  alternates: { canonical: "/download/" },
};

export default function Page() {
  return (
    <AppLinkFallback
      title="Test"
      description="Bu havola 4000 Words ilovasida ochiladi. Ilova o'rnatilmagan bo'lsa, Google Play'dan yuklab oling."
    />
  );
}
