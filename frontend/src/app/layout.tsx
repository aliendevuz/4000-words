import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { TelegramProvider } from "@/components/TelegramProvider";
import { KEYWORDS, SITE } from "@/lib/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [...KEYWORDS],
  applicationName: SITE.name,
  authors: [{ name: "Ibrohim Xalilov" }],
  creator: "Ibrohim Xalilov",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    locale: SITE.locale,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  // Brauzer paneli rangi — ilova temasiga mos.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#2f3645" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={SITE.lang} className={inter.variable}>
      <body className="min-h-dvh antialiased">
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
