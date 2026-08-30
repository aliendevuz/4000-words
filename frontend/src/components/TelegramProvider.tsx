"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import type { TelegramWebApp } from "@/types/telegram";

interface TelegramContextValue {
  /** Sayt Telegram ichida ochilganmi. Oddiy brauzerda har doim false. */
  isTelegram: boolean;
  webApp: TelegramWebApp | null;
}

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  webApp: null,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

/**
 * Telegram WebApp holati React'dan tashqarida yashaydi: uni sahifadagi
 * skript istalgan paytda yuklab qo'yishi mumkin. Shuning uchun oddiy
 * tashqi store sifatida saqlanadi.
 */
const listeners = new Set<() => void>();
let webApp: TelegramWebApp | null = null;
let initialized = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return webApp;
}

function getServerSnapshot(): TelegramWebApp | null {
  return null;
}

/**
 * Telegram muhitini aniqlaydi va sozlaydi. Sayt oddiy brauzerda ochilsa
 * `initData` bo'sh bo'ladi va hech narsa o'zgarmaydi.
 */
function connect() {
  if (initialized) return;
  const app = window.Telegram?.WebApp;
  if (!app || !app.initData) return;

  initialized = true;
  app.ready();
  app.expand();
  document.body.dataset.telegram = "true";
  applyTheme(app);
  applyViewport(app);

  app.onEvent("themeChanged", () => applyTheme(app));
  app.onEvent("viewportChanged", () => applyViewport(app));

  webApp = app;
  for (const listener of listeners) listener();
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const app = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo(
    () => ({ isTelegram: app !== null, webApp: app }),
    [app],
  );

  // Skript allaqachon yuklangan bo'lishi mumkin — onLoad ishlamasa ham
  // birinchi render'da tekshiriladi.
  const handleLoad = useCallback(() => connect(), []);

  return (
    <TelegramContext.Provider value={value}>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={handleLoad}
        onReady={handleLoad}
      />
      {children}
    </TelegramContext.Provider>
  );
}

/** Telegram tema ranglarini CSS o'zgaruvchilariga o'tkazadi. */
function applyTheme(app: TelegramWebApp) {
  const root = document.documentElement;
  for (const [key, color] of Object.entries(app.themeParams)) {
    if (color) root.style.setProperty(`--tg-${key.replace(/_/g, "-")}`, color);
  }
  root.classList.toggle("dark", app.colorScheme === "dark");
}

/**
 * Telegram'da `100vh` klaviatura va pastki panel sabab noto'g'ri bo'ladi,
 * shuning uchun haqiqiy balandlik CSS o'zgaruvchisiga yoziladi.
 */
function applyViewport(app: TelegramWebApp) {
  const root = document.documentElement;
  root.style.setProperty("--tg-viewport-height", `${app.viewportHeight}px`);
  root.style.setProperty(
    "--tg-viewport-stable-height",
    `${app.viewportStableHeight}px`,
  );
}
