import Link from "next/link";

import { AppRedirect } from "@/components/AppRedirect";

interface Props {
  title: string;
  description: string;
  /** Sahifa ochilishi bilan Play Store'ga yo'naltirilsinmi. */
  auto?: boolean;
}

export function AppLinkFallback({ title, description, auto }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div
        className="rounded-3xl border p-8 text-center"
        style={{
          background: "var(--app-surface)",
          borderColor: "var(--app-border)",
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3" style={{ color: "var(--app-text-soft)" }}>
          {description}
        </p>
        <AppRedirect auto={auto} />
        <Link href="/" className="mt-4 inline-block text-sm opacity-70 hover:underline">
          Bosh sahifa
        </Link>
      </div>
    </main>
  );
}
