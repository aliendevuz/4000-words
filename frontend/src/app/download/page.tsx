import type { Metadata } from "next";

import { AppRedirect } from "@/components/AppRedirect";
import { AppStats } from "@/components/AppStats";
import { JsonLd } from "@/components/JsonLd";
import { APP, SITE } from "@/lib/config";
import { appSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Ilovani yuklab olish — 4000 Essential English Words",
  description:
    "4000 Words ilovasini Android uchun bepul yuklab oling: inglizcha so'zlar o'zbekcha tarjimasi, talaffuzi, misollar, hikoyalar va testlar bilan.",
  alternates: { canonical: "/download/" },
  openGraph: {
    type: "website",
    url: `${SITE.url}/download/`,
    siteName: SITE.name,
    locale: SITE.locale,
    title: "4000 Words ilovasini yuklab olish",
    description:
      "Ingliz tili so'zlarini o'zbekcha o'rganish uchun bepul Android ilova.",
  },
};

export default function DownloadPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <JsonLd data={appSchema()} />

      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{SITE.name}</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--app-text-soft)" }}>
          {APP.developer} · {APP.category}
        </p>
      </header>

      <AppStats className="mt-6" />

      <AppRedirect />

      <p
        className="mt-4 text-center text-sm"
        style={{ color: "var(--app-text-soft)" }}
      >
        Android uchun, bepul.
      </p>
    </main>
  );
}
