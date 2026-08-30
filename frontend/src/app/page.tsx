import {
  BookOpen,
  BookText,
  Brain,
  ClipboardCheck,
  MessageSquareQuote,
  Volume2,
} from "lucide-react";

import { AppRedirect } from "@/components/AppRedirect";
import { AppStats } from "@/components/AppStats";
import { JsonLd } from "@/components/JsonLd";
import { APP, SITE } from "@/lib/config";
import { FAQ } from "@/lib/faq";
import { appSchema, faqSchema, websiteSchema } from "@/lib/schema";

/** Play Store tavsifidagi imkoniyatlar. */
const FEATURES = [
  {
    icon: BookOpen,
    title: "Inglizcha–o'zbekcha lug'at",
    text: "So'zlarni o'zbekcha tarjimasi bilan yodlang.",
  },
  {
    icon: Volume2,
    title: "Talaffuz",
    text: "Har bir so'z qanday aytilishini eshiting.",
  },
  {
    icon: MessageSquareQuote,
    title: "Hayotiy misollar",
    text: "So'z gap ichida qanday ishlatilishini ko'ring.",
  },
  {
    icon: BookText,
    title: "Hikoyalar",
    text: "O'rgangan so'zlaringiz asosidagi hikoyalar bilan mashq qiling.",
  },
  {
    icon: ClipboardCheck,
    title: "Testlar",
    text: "Istalgan unitlarni tanlab test topshiring.",
  },
  {
    icon: Brain,
    title: "Xatolarni eslab qoladi",
    text: "Ko'p xato qilgan so'zlaringiz testlarda tez-tez uchraydi.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <JsonLd data={[websiteSchema(), appSchema(), faqSchema()]} />

      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Ingliz tili so'zlarini o'zbekcha o'rganing
        </h1>
        <p className="mt-3 leading-relaxed" style={{ color: "var(--app-text-soft)" }}>
          «4000 Essential English Words» kitobi asosidagi bepul ilova:
          inglizcha so'zlarni tarjimasi, talaffuzi va misollar bilan yodlang.
        </p>
        <p className="mt-3 text-sm" style={{ color: "var(--app-text-soft)" }}>
          {APP.developer} · {APP.category}
        </p>
      </header>

      <AppStats className="mt-6" />

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Ilova imkoniyatlari</h2>
        <ul className="mt-4 space-y-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <Icon
                className="mt-0.5 size-5 shrink-0 text-brand"
                aria-hidden
                strokeWidth={2}
              />
              <div>
                <p className="font-semibold leading-snug">{title}</p>
                <p
                  className="mt-0.5 text-sm leading-snug"
                  style={{ color: "var(--app-text-soft)" }}
                >
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <AppRedirect />

      <p
        className="mt-4 text-center text-sm"
        style={{ color: "var(--app-text-soft)" }}
      >
        Android uchun, bepul.
      </p>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Ko'p so'raladigan savollar</h2>
        <dl className="mt-4 space-y-5">
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <dt className="font-semibold leading-snug">{q}</dt>
              <dd
                className="mt-1 text-sm leading-relaxed"
                style={{ color: "var(--app-text-soft)" }}
              >
                {a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <footer
        className="mt-14 border-t pt-6 text-center text-xs"
        style={{
          borderColor: "var(--app-border)",
          color: "var(--app-text-soft)",
        }}
      >
        {SITE.name} · {APP.developer}
      </footer>
    </main>
  );
}
