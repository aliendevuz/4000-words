import { Download, ShieldCheck, Star } from "lucide-react";

import { APP } from "@/lib/config";

const STATS = [
  { icon: Star, value: APP.rating, label: `${APP.reviews} ta sharh` },
  { icon: Download, value: APP.installs, label: "yuklanma" },
  { icon: ShieldCheck, value: APP.contentRating, label: "yosh" },
];

/** Google Play sahifasidagi asosiy ko'rsatkichlar. */
export function AppStats({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid grid-cols-3 rounded-2xl border py-4 ${className}`}
      style={{
        background: "var(--app-surface)",
        borderColor: "var(--app-border)",
      }}
    >
      {STATS.map(({ icon: Icon, value, label }, i) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1 px-2 text-center"
          style={{
            // Ustunlar orasidagi ajratuvchi chiziq.
            borderLeft: i > 0 ? "1px solid var(--app-border)" : undefined,
          }}
        >
          <Icon className="size-4 text-brand" aria-hidden />
          <span className="text-lg font-semibold leading-none">{value}</span>
          <span className="text-xs" style={{ color: "var(--app-text-soft)" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
