"use client";

import { useEffect, useSyncExternalStore } from "react";

import { ANDROID } from "@/lib/config";

/** Statik HTML va brauzer farqini hydration'ga zarar bermay aniqlash. */
const noSubscribe = () => () => {};

function isAndroid() {
  return (
    typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)
  );
}

/**
 * AppLinks fallback. Bu manzillar Android ilovada ochilishi kerak; ilova
 * o'rnatilmagan bo'lsa brauzer shu sahifani ko'rsatadi va Google Play'ga
 * yo'naltiradi.
 */
export function AppRedirect({ auto = false }: { auto?: boolean }) {
  // Statik HTML Play Store havolasi bilan chiqadi; Android'da hydration'dan
  // keyin market intent'iga almashadi.
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  const href =
    hydrated && isAndroid() ? ANDROID.intentUrl : ANDROID.playStoreUrl;

  useEffect(() => {
    if (!auto) return;
    window.location.href = isAndroid()
      ? ANDROID.intentUrl
      : ANDROID.playStoreUrl;
  }, [auto]);

  return (
    <a
      href={href}
      className="mt-8 inline-block w-full rounded-2xl bg-brand px-6 py-4 text-center text-lg font-semibold text-white transition hover:bg-brand-dark"
    >
      Google Play'da ochish
    </a>
  );
}
