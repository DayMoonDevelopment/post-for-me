import type { ParseKeys } from "i18next";

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
  // A key that resolves to nothing renders as its own path — "playground.foo" in
  // the middle of the UI. Typed keys (see `i18next.d.ts`) catch a bad literal at
  // build time, but NOT a key assembled at runtime (`t(`status.${s}`)`) or a
  // plural form that was never added. In development, make that loud instead of
  // shipping it; in production stay silent rather than spamming a user's console.
  debug: import.meta.env?.DEV ?? false,
  saveMissing: import.meta.env?.DEV ?? false,
  missingKeyHandler: (
    lngs: readonly string[],
    ns: string,
    key: string,
  ): void => {
    if (import.meta.env?.DEV) {
      console.error(
        `[i18n] missing key "${key}" in ${ns} (${lngs.join(", ")}) — ` +
          `it will render as its own path. If the key is built at runtime, ` +
          `check every member of the union has an entry.`,
      );
    }
  },
} as const;

/**
 * A key that exists in the translation bundle.
 *
 * Use this — never `string` — for any prop, config field or variable that
 * carries a translation key around before `t()` sees it. Typing the *carrier*
 * is what makes the eventual `t(key)` checkable; a `string` here widens the key
 * and silently opts that call site out of type safety.
 *
 * For keys built from a value (`t(`status.${s}`)`), type the value as a finite
 * union rather than `string` and TypeScript will verify every branch.
 */
export type TranslationKey = ParseKeys;

/**
 * A key whose value is a structured content block (an array/object), read with
 * `t(key, { returnObjects: true })` rather than rendered as a sentence.
 *
 * Separate from {@link TranslationKey} on purpose: the default key union only
 * contains keys that resolve to STRINGS, so a content-block key looks like a
 * typo to it. Keeping the two apart means the string case stays strict — a real
 * typo in ordinary copy is still a build error — while structured content is
 * still checked against the bundle.
 */
export type TranslationContentKey = ParseKeys<"common", { returnObjects: true }>;
