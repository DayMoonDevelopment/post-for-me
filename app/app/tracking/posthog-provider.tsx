import type { ReactNode } from "react";

import { PostHogProvider as BasePostHogProvider } from "posthog-js/react";

/**
 * Initializes the browser PostHog client. The config here is what makes ad
 * attribution work WITHOUT any custom cookie: `person_profiles: "always"` gives
 * even anonymous visitors a person profile, so PostHog latches first-touch
 * attribution (`$initial_gclid` / `$initial_utm_*` / …) at landing and merges it
 * onto the user at `identify()` — which is exactly what the PostHog → Meta/Google
 * Ads destinations read on the server-emitted `user_converted` event.
 *
 * `cross_subdomain_cookie` shares the anonymous distinct_id across
 * `*.postforme.dev`, so a visitor's marketing-site activity stitches to their
 * dashboard user. No-op (renders children only) when the key is unset.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  if (!apiKey) return <>{children}</>;

  const apiHost =
    import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

  return (
    <BasePostHogProvider
      apiKey={apiKey}
      options={{
        api_host: apiHost,
        defaults: "2025-05-24",
        person_profiles: "always",
        cross_subdomain_cookie: true,
        persistence: "localStorage+cookie",
      }}
    >
      {children}
    </BasePostHogProvider>
  );
}
