/**
 * Ad-attribution cookie read helpers. The cookie itself is written by the
 * marketing site (`marketing/app/components/attribution-capture.tsx`) on
 * landing pages that carry a `gclid`/`fbclid`/`utm_*` param, and is scoped to
 * the apex domain so it crosses the `marketing → app.` subdomain hop.
 */

const COOKIE_NAME = "pfm_attribution";

export type AdAttribution = {
  gclid?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_url?: string;
  referrer?: string;
  captured_at?: string;
};

export function readAttributionFromCookieString(
  cookieHeader: string | null | undefined,
): AdAttribution | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) {
      try {
        return JSON.parse(decodeURIComponent(rest.join("=")));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function readAttributionFromBrowser(): AdAttribution | null {
  if (typeof document === "undefined") return null;
  return readAttributionFromCookieString(document.cookie);
}

export type MetaPixelCookies = {
  fbc?: string;
  fbp?: string;
};

/**
 * `_fbc` and `_fbp` are set by Meta Pixel when it loads (`fbq('init', …)` +
 * `PageView`). `_fbc` is the Meta-format click id (`fb.<index>.<ts>.<fbclid>`)
 * — richer than the raw `fbclid` for Meta's matching, so we prefer it when
 * present and fall back to constructing from `fbclid` only if missing.
 */
export function readMetaPixelCookiesFromCookieString(
  cookieHeader: string | null | undefined,
): MetaPixelCookies {
  const result: MetaPixelCookies = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    const value = rest.join("=");
    if (name === "_fbc" && value) result.fbc = decodeURIComponent(value);
    else if (name === "_fbp" && value) result.fbp = decodeURIComponent(value);
  }
  return result;
}

export function readMetaPixelCookiesFromBrowser(): MetaPixelCookies {
  if (typeof document === "undefined") return {};
  return readMetaPixelCookiesFromCookieString(document.cookie);
}
