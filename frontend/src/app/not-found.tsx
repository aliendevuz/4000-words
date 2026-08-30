import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Sahifa topilmadi</h1>
      <Link
        href="/"
        className="mt-6 inline-block font-medium hover:underline"
        style={{ color: "var(--app-text-soft)" }}
      >
        Bosh sahifaga qaytish
      </Link>
    </main>
  );
}
