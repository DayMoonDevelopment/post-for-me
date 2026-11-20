import { servicesContext } from "~/lib/.server/services";
import { isSocialProvider } from "~/lib/onboarding";

import type { Route } from "./+types/route";

/**
 * `GET /api/projects/:projectId/credentials?provider=…` — ONE provider's
 * developer app id + secret, returned as data for the settings sheet's
 * reveal/edit affordance.
 *
 * Security, mirroring `api.social-accounts.$socialAccountId.tokens`:
 *
 * - The values are NEVER in any page loader / document. They travel only
 *   through this dedicated, auth-guarded endpoint, hit by an explicit `fetch`
 *   when a member asks to edit that provider's keys. Everything else — status
 *   dots, "Added"/"Not added", enablement — runs off the presence booleans in
 *   the settings loader.
 * - QUICKSTART IS REFUSED OUTRIGHT. Those rows hold Post for Me's shared system
 *   credentials, copied in when the platform was enabled; no member of any team
 *   may read them. `getCredential` returns null for a system project before it
 *   reads anything, and we 404 here so the endpoint can't even be used to probe
 *   which providers a Quickstart project has.
 * - Access is scoped by RLS: `projects.get` throws unless the caller is a member
 *   of the owning team, and the credential read runs on the same user-scoped
 *   client (whose policy also excludes system projects independently).
 * - A RAW JSON `Response` (not a plain object) so a bare
 *   `fetch().then((r) => r.json())` gets clean JSON rather than React Router's
 *   turbo-stream encoding, with `Cache-Control: no-store` so the secret is never
 *   persisted by a cache.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { projects, providerCredentials } = context.get(servicesContext);
  const projectId = params.projectId;

  const provider = new URL(request.url).searchParams.get("provider");
  if (!isSocialProvider(provider)) {
    throw new Response("Not found", { status: 404 });
  }

  // Throws under RLS if the caller can't reach this project.
  const project = await projects.get(projectId);
  if (project.type === "quickstart") {
    throw new Response("Not found", { status: 404 });
  }

  const credential = await providerCredentials.getCredential(projectId, provider);

  return new Response(
    JSON.stringify({
      appId: credential?.appId ?? "",
      appSecret: credential?.appSecret ?? "",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
