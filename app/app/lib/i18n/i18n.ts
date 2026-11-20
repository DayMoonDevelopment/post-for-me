import { createInstance, type i18n } from "i18next";
import { initReactI18next } from "react-i18next";

import { baseI18nOptions, fallbackLng, isSupportedLocale, type Locale } from "./config";
import { resources } from "./resources";

/**
 * Create a fully-initialized i18next instance **synchronously**.
 *
 * With bundled `resources` (no async backend) and `initAsync: false`, `init()`
 * completes in the same tick, so the returned instance is usable immediately.
 */
export function createI18nInstance(lng: Locale): i18n {
  const instance = createInstance();
  instance.use(initReactI18next).init({
    ...baseI18nOptions,
    lng,
    resources,
    initAsync: false,
  });
  return instance;
}

/**
 * The browser's single i18next instance, created once **at module load** — i.e.
 * before `hydrateRoot` runs — from the locale the server already rendered into
 * `<html lang>`. Two things matter here, and both prevent a flash:
 *
 * - It's built *outside* the React render, so the very first client render
 *   already reads a fully-initialized instance (no untranslated first paint).
 * - It's a stable module-level value, so `<I18nextProvider>` never swaps
 *   instance identity between renders (no consumer re-render / not-ready churn).
 *
 * `null` on the server, where each request must instead get its own instance
 * (see `Layout` in `app/root.tsx`); a shared one would race across concurrent
 * requests in different languages.
 */
export const browserI18n: i18n | null =
  typeof document === "undefined"
    ? null
    : createI18nInstance(
        isSupportedLocale(document.documentElement.lang)
          ? document.documentElement.lang
          : fallbackLng,
      );
