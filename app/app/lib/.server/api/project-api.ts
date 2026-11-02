import type { RouterContextProvider } from "react-router";

import type { SessionUser } from "~/lib/.server/services/auth.service";
import type { Team } from "~/lib/types/team";

import { logError } from "~/lib/.server/errors";
import { requireTeamMember } from "~/lib/.server/guards";
import { currentUserContext, servicesContext } from "~/lib/.server/services";

import type { ApiClient } from "./client";

import { createApiClient } from "./client";
import { resolveTemporaryApiKey } from "./temporary-key";

/** The guarded principal for a project request: the owning team (membership
 * enforced) + the session user. The shared entry both key-minting paths (temp
 * key for API calls, and the user's own API keys) resolve first. */
export interface ProjectPrincipal {
  team: Team;
  user: SessionUser;
}

/** Resolve + guard the principal for a project. Throws 404 (missing project) or
 * 403 (non-member) — these are real gates, not "unavailable" degradations. */
export async function resolveProjectPrincipal(
  context: Readonly<RouterContextProvider>,
  projectId: string,
): Promise<ProjectPrincipal> {
  const { projects } = context.get(servicesContext);
  const project = await projects.get(projectId);
  const team = await requireTeamMember(context, project.teamId);
  const user = context.get(currentUserContext);
  return { team, user };
}

/** Why the API client couldn't be resolved (drives the UI's "unavailable"
 * state). `no_subscription` = active billing required; `error` = misconfig /
 * transient failure (already logged). */
export type ProjectApiUnavailableReason = "error" | "no_subscription";

export interface ProjectApiResult {
  apiClient: ApiClient | null;
  /** Response headers to merge (Set-Cookie for a freshly-minted temp key). */
  headers?: Headers;
  reason?: ProjectApiUnavailableReason;
  /** The owning team — always resolved (the membership guard runs first), so the
   * gated "set up billing" CTA has the team it needs even when unavailable. */
  teamId: string;
  unavailable: boolean;
}

/**
 * The single entry point a loader/action uses to call the real API on behalf of
 * a project. Guards team membership, enforces the active-subscription gate, then
 * mints/reuses the project's temporary API key and returns a client bound to it.
 *
 * This is the reusable foundation: any entity we migrate off the Supabase
 * adapters onto the API (everything except admin — projects/teams) resolves its
 * client here. Callers MUST merge the returned `headers` into their response so
 * a newly-minted key is cached.
 */
export async function resolveProjectApiClient(
  context: Readonly<RouterContextProvider>,
  request: Request,
  projectId: string,
): Promise<ProjectApiResult> {
  // These are real gates — a missing project (404) or non-member (403) throw.
  const { team, user } = await resolveProjectPrincipal(context, projectId);

  try {
    // The temp-key resolver short-circuits on a cached cookie; the subscription
    // gate + mint run only on a miss.
    const tempKey = await resolveTemporaryApiKey({
      request,
      projectId,
      teamId: team.id,
      userId: user.id,
      stripeCustomerId: team.stripeCustomerId,
    });
    if (!tempKey.apiKey) {
      return {
        apiClient: null,
        unavailable: true,
        reason: tempKey.reason ?? "error",
        teamId: team.id,
      };
    }

    const headers = tempKey.setCookieHeader
      ? new Headers({ "Set-Cookie": tempKey.setCookieHeader })
      : undefined;
    return {
      apiClient: createApiClient(tempKey.apiKey),
      unavailable: false,
      headers,
      teamId: team.id,
    };
  } catch (error) {
    // Unkey/Stripe misconfig or a transient failure — degrade to an in-page
    // "unavailable" notice rather than the full error boundary.
    logError(error, { projectId, surface: "resolveProjectApiClient" });
    return { apiClient: null, unavailable: true, reason: "error", teamId: team.id };
  }
}
