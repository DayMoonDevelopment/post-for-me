import { PostHog } from "posthog-node";

// Server-side PostHog, used to count registry installs (see
// app/registry-serve/route.loader.ts). Opt-in and inert by default: with no
// POSTHOG_API_KEY set, the client is null and every capture is a no-op, so the
// app runs with zero config. This is a SERVER env var (not VITE_-prefixed) — it
// never reaches the browser; it can be the same PostHog project key as the
// client-side VITE_POSTHOG_KEY.
//
// We never create person profiles here ($process_person_profile: false) — these
// are anonymous event counts, not user/conversion tracking.

const KEY = process.env.POSTHOG_API_KEY;
const HOST = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;
  // flushAt: 1 sends each event promptly (low volume); the send is async and
  // never blocks the response.
  client = KEY ? new PostHog(KEY, { host: HOST, flushAt: 1 }) : null;
  return client;
}

type InstallEvent = {
  component: string;
  variant: string;
  base?: string;
  style?: string;
};

export async function captureInstall(event: InstallEvent): Promise<void> {
  const posthog = getClient();
  if (!posthog) return;
  posthog.capture({
    distinctId: "registry",
    event: "component_installed",
    properties: {
      ...event,
      $process_person_profile: false,
    },
  });
  // On serverless (Vercel) the function freezes right after the response, before
  // posthog-node's background batch would flush — so flush explicitly and await
  // it. Errors are swallowed: analytics must never affect the registry response.
  try {
    await posthog.flush();
  } catch {
    // best-effort — ignore analytics delivery failures
  }
}
