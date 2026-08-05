import { createCookie, redirect } from "react-router";

import { localPath } from "~/lib/.server/local-path";

/**
 * Flash messaging — the global "pass an error (or success) through a redirect"
 * channel. A `redirect.*` route never returns renderable data (that's how you
 * end up staring at raw JSON after a no-JS POST); on failure it **redirects back
 * to where the user came from** and stashes the message in this one-time cookie.
 * The root loader reads + clears it and the root component toasts it — so any
 * redirect, from anywhere, surfaces its error on-screen with zero per-route UI.
 */

export type Flash = { error?: string; success?: string };

// httpOnly: only the server (root loader) reads it, then hands it to the client
// as loader data. Short-lived + cleared on read, so it fires exactly once.
const flashCookie = createCookie("flash", {
  path: "/",
  maxAge: 60,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

export async function readFlash(request: Request): Promise<Flash | null> {
  const value = await flashCookie.parse(request.headers.get("cookie"));
  return value && typeof value === "object" ? (value as Flash) : null;
}

/** A `Set-Cookie` that expires the flash — emit it from the root loader once the
 * flash has been read, so it can't re-fire on refresh. */
export async function clearedFlashCookie(): Promise<string> {
  return flashCookie.serialize({}, { maxAge: 0 });
}

/**
 * Pick where a failed redirect returns to: an explicit, local `return_to`
 * (preferred — the form stamps the current path), else the same-origin
 * `Referer`, else `/`. Open-redirect safety is {@link localPath}'s job — a
 * candidate that isn't genuinely local falls through to the next option rather
 * than being trusted.
 */
function safeReturnTo(
  request: Request,
  candidate: string | null | undefined,
  fallback: string,
): string {
  const local = localPath(candidate);
  if (local) return local;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.origin === new URL(request.url).origin) {
        return url.pathname + url.search;
      }
    } catch {
      // ignore a malformed Referer
    }
  }
  return fallback;
}

/**
 * The standard failure exit for a `redirect.*` action: 302 back to the
 * originating page with the error flashed. The caller's page toasts it via the
 * root flash handler. Never returns data, so a no-JS document POST can't render
 * JSON.
 */
export async function redirectBackWithError(
  request: Request,
  message: string,
  opts?: { fallback?: string; returnTo?: string | null; },
): Promise<Response> {
  const to = safeReturnTo(request, opts?.returnTo, opts?.fallback ?? "/");
  return redirect(to, {
    headers: { "Set-Cookie": await flashCookie.serialize({ error: message }) },
  });
}
