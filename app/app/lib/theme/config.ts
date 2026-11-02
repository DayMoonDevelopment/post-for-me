/**
 * Shared theme config — safe to import on both the server and the client.
 *
 * Mirrors `lib/i18n/config.ts`'s shape: a single source of truth for which
 * preferences exist, read by both `theme.server.ts` (detection) and the
 * client-side toggle (so they can never disagree on what a valid value is).
 */

/** The three states a creator can pick. `"system"` defers to the OS. */
export const themePreferences = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof themePreferences)[number];

/** Used when detection finds no cookie yet — follow the OS until told otherwise. */
export const fallbackTheme: ThemePreference = "system";

/** Name of the cookie that persists the creator's explicit theme choice. */
export const themeCookieName = "theme";

export function isValidTheme(
  value: string | null | undefined,
): value is ThemePreference {
  return (
    value != null &&
    (themePreferences as readonly string[]).includes(value)
  );
}

/**
 * Maps a resolved preference to the class `<html>` should carry. `:root` in
 * `app.css` IS the light palette, so `"light"` needs no class at all — only
 * `"dark"` does. For `"system"`, `systemPrefersDark` decides: `false`
 * server-side and on the very first client render (the server can't know the
 * OS preference — `root.tsx`'s blocking inline script covers that gap for
 * first paint), then the live value from `useSystemPrefersDark` after that.
 *
 * Passing the live value in — rather than always resolving `"system"` to
 * `null` — matters beyond that first paint: React owns `<html>`'s
 * `className` as a controlled prop, so if this ever collapsed `"system"` to
 * a fixed value, ANY render where the preference changed (e.g. an explicit
 * `"dark"` selection followed by picking `"system"`) would make React
 * force-set the class back to that fixed value on the next commit —
 * silently undoing the theme menu's optimistic `classList` toggle.
 *
 * Lives here (not `theme.server.ts`) even though `root.tsx`'s loader is its
 * only real caller — `Layout` in the same file is an isomorphic export (runs
 * on both server and client), so anything it imports must not live in a
 * `.server.ts` module, or the client bundle fails to build.
 */
export function resolveThemeClass(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): "dark" | null {
  if (preference === "dark") return "dark";
  if (preference === "light") return null;
  return systemPrefersDark ? "dark" : null;
}

/**
 * What `.dark` should be for a given preference, given the OS's current
 * preference. Isomorphic (no server-only API), so the client-side toggle can
 * use it for an optimistic `classList` update ahead of the round-trip to
 * `/api/theme` — mirrors {@link resolveThemeClass} for the explicit cases, and
 * resolves `"system"` using the live OS state the server doesn't have.
 */
export function resolveThemeIsDark(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return systemPrefersDark;
}

/**
 * Blocking inline script for the `"system"` case only — `<html>` is rendered
 * with no theme class server-side (the server can't know the OS preference),
 * so this runs synchronously in `<head>`, before first paint, to resolve it.
 * Explicit `"light"`/`"dark"` never reach this: the class is already set
 * server-side by `resolveThemeClass`, so the script is skipped entirely.
 */
export const THEME_SYSTEM_SCRIPT = `(function(){try{var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
