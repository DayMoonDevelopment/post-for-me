/**
 * Shared i18n config — safe to import on both the server and the client.
 *
 * Keep this module free of server-only or browser-only APIs; it's the single
 * source of truth for which locales exist and how i18next is configured. The
 * isomorphic factory in `i18n.ts` builds every instance from it, so the
 * server-rendered markup and the client hydration always agree.
 */

/**
 * Locales the app ships translations for.
 *
 * English-only today — we are deliberately *set up* for multilingual without
 * shipping other languages yet. Turning one on is a small, well-defined change:
 *   1. add the tag here (e.g. `"es"`),
 *   2. add a matching resource file under `locales/<tag>/` and wire it into
 *      `resources.ts`,
 *   3. add the language-switcher UI + a writer for the `locale` cookie (a small
 *      resource route that POSTs the choice; detection in `locale.server.ts`
 *      already reads the cookie).
 * No entry/root re-wiring needed — that plumbing is locale-agnostic.
 */
export const supportedLngs = ["en"] as const;

export type Locale = (typeof supportedLngs)[number];

/** Used when detection finds nothing usable, and as the i18next `fallbackLng`. */
export const fallbackLng: Locale = "en";

/** The only namespace today. Split into more (e.g. per-feature) as the app grows. */
export const defaultNS = "common";

/** Name of the cookie that persists the creator's explicit locale choice. */
export const localeCookieName = "locale";

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value != null && (supportedLngs as readonly string[]).includes(value);
}

/**
 * Options shared by the server and client i18next instances. The per-instance
 * bits that must differ (`lng`, request-scoped `resources`) are passed in by
 * the caller; everything stable lives here so the two sides can't drift.
 */
export const baseI18nOptions = {
  supportedLngs: [...supportedLngs],
  fallbackLng,
  defaultNS,
  // Resources are bundled and preloaded, so translations resolve synchronously.
  // Disabling Suspense keeps `useTranslation` from ever throwing a promise
  // during SSR/hydration — there's nothing async to wait for. This is what
  // guarantees no "rendering blip" on first paint.
  react: { useSuspense: false },
  // React already escapes interpolated values, so i18next must not double-escape.
  interpolation: { escapeValue: false },
} as const;
