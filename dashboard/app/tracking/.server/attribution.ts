import {
  readAttributionFromCookieString,
  readMetaPixelCookiesFromCookieString,
  type AdAttribution,
  type MetaPixelCookies,
} from "../attribution";

export type { AdAttribution, MetaPixelCookies } from "../attribution";

/**
 * Read the ad-attribution cookie from a server-side Request. Used at checkout
 * to stamp the captured `gclid`/`fbclid`/`utm_*` onto `subscription_data.metadata`
 * so the conversion webhook can put them on the `customer_converted` event.
 */
export function readAttributionFromRequest(
  request: Request,
): AdAttribution | null {
  return readAttributionFromCookieString(request.headers.get("cookie"));
}

/**
 * Read Meta Pixel's `_fbc` / `_fbp` cookies from a server-side Request. The
 * pixel writes them on the apex domain so they're available here at checkout.
 */
export function readMetaPixelCookiesFromRequest(
  request: Request,
): MetaPixelCookies {
  return readMetaPixelCookiesFromCookieString(request.headers.get("cookie"));
}
