import { createCookie } from "react-router";

import {
  fallbackLng,
  isSupportedLocale,
  type Locale,
  localeCookieName,
} from "./config";

const isProd = process.env.NODE_ENV === "production";

/**
 * Persists the creator's explicit language choice. Not `httpOnly` — locale is
 * not sensitive and there's no harm in client code reading it. A long maxAge so
 * the choice survives across visits.
 *
 * Detection (below) already reads this cookie. There is no *writer* yet because
 * we ship one language — wire the language-switcher's resource route to
 * `localeCookie.serialize(locale)` when a second locale lands.
 */
export const localeCookie = createCookie(localeCookieName, {
  path: "/",
  sameSite: "lax",
  secure: isProd,
  maxAge: 365 * 24 * 60 * 60,
});

/**
 * Parse an `Accept-Language` header (e.g. `en-US,en;q=0.9,es;q=0.8`) into base
 * language tags ordered by descending q-value. Tags are lowercased and the
 * region subtag is dropped (`en-US` → `en`) so they can match `supportedLngs`.
 */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase().split("-")[0], quality };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.quality))
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);
}

/**
 * Resolve the active locale for a request, in priority order:
 *   1. the `locale` cookie (the creator's explicit choice), then
 *   2. the best match from the `Accept-Language` header, then
 *   3. the fallback locale.
 *
 * No URL-prefix detection by design — locale never appears in the path.
 */
export async function detectLocale(request: Request): Promise<Locale> {
  const cookieHeader = request.headers.get("Cookie");
  const fromCookie = (await localeCookie.parse(cookieHeader)) as string | null;
  if (isSupportedLocale(fromCookie)) return fromCookie;

  const acceptLanguage = request.headers.get("Accept-Language");
  if (acceptLanguage) {
    for (const tag of parseAcceptLanguage(acceptLanguage)) {
      if (isSupportedLocale(tag)) return tag;
    }
  }

  return fallbackLng;
}
