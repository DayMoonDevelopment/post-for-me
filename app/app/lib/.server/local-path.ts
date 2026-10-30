/**
 * The one place we decide "is this caller-supplied value safe to redirect to?".
 *
 * Three surfaces need this — the flash channel's `return_to`, the billing
 * portal's `return_url`, and Checkout's `cancel_url` — and each used to carry
 * its own copy of the check. The copies drifted: two normalized through the URL
 * parser, one compared strings, and the string one accepted `/\evil.com`, which
 * browsers normalize to `//evil.com` and follow OFF-SITE. One implementation,
 * so a value that's safe here is safe everywhere.
 *
 * A value is local only when it survives BOTH gates:
 *
 *  1. **Same origin after parsing.** `//evil.com`, `/\evil.com`, `///evil.com`
 *     and `/<tab>/evil.com` all resolve to a different origin — the string
 *     "starts with a single slash" tells you nothing, the parser does.
 *  2. **The normalized path isn't itself protocol-relative.** `/..//evil.com`
 *     and `/.//evil.com` keep our origin but normalize to `//evil.com`, which
 *     is protocol-relative all over again once it lands in a `Location` header.
 *
 * Callers get `null` for anything that fails, so they choose their own fallback
 * rather than being silently redirected to `/`.
 */

/** Sentinel base for parsing. Never leaves this module — it exists only so a
 * relative value has something to resolve against, and so a value that escapes
 * to another origin is detectable by comparing back to it. */
const SENTINEL_ORIGIN = "http://local";

/** Parse `value` as a path on the sentinel origin, or null if it escapes. */
function parseLocal(value: null | string | undefined): null | URL {
  // Must be path-absolute to begin with: this rejects `https://evil.com`,
  // `javascript:…`, and bare relative values before the parser sees them.
  if (!value || !value.startsWith("/")) return null;

  let url: URL;
  try {
    url = new URL(value, SENTINEL_ORIGIN);
  } catch {
    return null;
  }

  // Gate 1 — anything that resolved to another host isn't ours.
  if (url.origin !== SENTINEL_ORIGIN) return null;
  return url;
}

/** Reject a normalized path that is itself protocol-relative (gate 2). */
function guardPath(path: string): null | string {
  return path.startsWith("//") ? null : path;
}

/**
 * `value` as a local path **with its query preserved**, or null.
 *
 * Use this when the destination's own query matters — the billing portal's
 * "Return to Post for Me" should land the customer exactly where they left,
 * filters and all.
 */
export function localPath(value: null | string | undefined): null | string {
  const url = parseLocal(value);
  if (!url) return null;
  return guardPath(`${url.pathname}${url.search}`);
}

/**
 * `value` as a local path with its query **dropped**, or null.
 *
 * Use this when the caller appends its own params and the origin page's query
 * would fight with them — Checkout's "← back" re-opens the plan picker via its
 * own flag, so carrying the page's `?setup=tour` through would open two things.
 */
export function localPathname(value: null | string | undefined): null | string {
  const url = parseLocal(value);
  if (!url) return null;
  return guardPath(url.pathname);
}
