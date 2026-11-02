import * as React from "react";

/**
 * `true` once the component has mounted on the client — i.e. after hydration.
 *
 * Gate JS-only interactions with this so they can't fire from server-rendered
 * HTML before React takes over. The login flow is fetcher-driven, so a submit
 * before hydration would otherwise do a full-page native POST to
 * `/login?index` instead of a background fetch.
 *
 * Server and first client render both return `false` (no hydration mismatch);
 * the effect flips it to `true` immediately after mount.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  return hydrated;
}
