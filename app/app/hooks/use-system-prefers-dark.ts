import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Live OS dark-mode preference. `false` on the server and for the very first
 * client render (the server can't know it — `root.tsx`'s blocking inline
 * script covers that gap for the `"system"` theme's initial paint); reactive
 * from there, including to the user flipping their OS setting live.
 *
 * `Layout` uses this so React's rendered `<html>` class is the single source
 * of truth for `"system"` too — without it, `resolveThemeClass` always
 * resolves `"system"` to `null`, and any transition through an explicit
 * `"dark"` selection causes React to force-remove the `dark` class on the
 * next render, undoing the theme menu's optimistic toggle.
 */
export function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
