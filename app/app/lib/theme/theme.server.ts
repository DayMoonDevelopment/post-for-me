import { createCookie } from "react-router";

import {
  fallbackTheme,
  isValidTheme,
  themeCookieName,
  type ThemePreference,
} from "./config";

const isProd = process.env.NODE_ENV === "production";

/**
 * Persists the creator's explicit theme choice. Not `httpOnly` — theme is not
 * sensitive and the client toggle needs to read it too. A long maxAge so the
 * choice survives across visits.
 *
 * Written by the `/api/theme` resource route's action.
 */
export const themeCookie = createCookie(themeCookieName, {
  path: "/",
  sameSite: "lax",
  secure: isProd,
  maxAge: 365 * 24 * 60 * 60,
});

/**
 * Resolve the active theme preference for a request. No `Accept-Language`-style
 * header to fall back on — `"system"` (no cookie) is a valid, deliberate default,
 * resolved to an actual light/dark class client-side via `resolveThemeClass`
 * (in `./config`) plus the blocking inline script in `root.tsx` for the
 * no-cookie case.
 */
export async function detectTheme(request: Request): Promise<ThemePreference> {
  const cookieHeader = request.headers.get("Cookie");
  const fromCookie = (await themeCookie.parse(cookieHeader)) as string | null;
  if (isValidTheme(fromCookie)) return fromCookie;

  return fallbackTheme;
}
