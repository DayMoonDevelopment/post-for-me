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
        person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
      });
    }

    setHydrated(true);
  }, []);

  if (!hydrated) return <>{children}</>;

  return <RootPostHogProvider client={posthog}>{children}</RootPostHogProvider>;
}
