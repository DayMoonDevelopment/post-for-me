import posthog from "posthog-js";
import { PostHogProvider as RootPostHogProvider } from "posthog-js/react";
import { useEffect, useState } from "react";

export function PostHogProvider({
  apiKey,
  apiHost,
  children,
}: {
  apiKey: string | undefined;
  apiHost: string | undefined;
  children: React.ReactNode;
}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (apiKey && apiHost) {
      posthog.init(apiKey, {
        api_host: apiHost,
        defaults: "2025-05-24",
        // 'always' so anonymous visitors get a person profile and PostHog latches
        // first-touch attribution ($initial_gclid/$initial_utm_*/$gclid etc.) at
        // landing. Combined with cross_subdomain_cookie below, that attribution
        // merges onto the user at identify() — which is what the Google/Meta Ads
        // destinations read. 'identified_only' skips person props on anonymous
        // events, so the click ID never latches and conversions go unattributed.
        person_profiles: "always",
        // Share the anonymous distinct_id across *.postforme.dev so a visitor's
        // marketing-site activity stitches to their dashboard user on identify().
        cross_subdomain_cookie: true,
        persistence: "localStorage+cookie",
      });
    }

    setHydrated(true);
  }, []);

  if (!hydrated) return <>{children}</>;

  return <RootPostHogProvider client={posthog}>{children}</RootPostHogProvider>;
}
