import type { RouterContextProvider } from "react-router";

import type { SessionUser } from "~/lib/.server/services/auth.service";
import type { Team } from "~/lib/types/team";

import { ForbiddenException, UnauthorizedException } from "~/lib/.server/errors";
import { servicesContext } from "~/lib/.server/services";

/**
 * Auth guards for the data-route namespaces (`api`/`redirect`/`callback`). These
 * sit OUTSIDE the `_protected` layout, so they don't inherit its middleware —
 * most endpoints call a guard on line one instead (the NestJS-guard analog).
 *
 * The exception is `callback/teams/:teamId/*`, which has a gate-only layout
 * (`callback.teams.$teamId/route.middleware.ts`) running both guards for the
 * whole namespace. That's the preferred shape when a namespace has more than one
 * route or is likely to grow — a per-endpoint call is one someone can forget,
 * and the Checkout return is where that already happened. Call them inline only
 * for a genuinely standalone endpoint.
 *
 * They throw a `Response` (401/403) rather than redirecting: these routes return
 * data / are hit by fetchers, so a status code is the right signal. RLS already
 * scopes every query to the user's memberships, so the guards are about clean
 * status codes + failing fast, not preventing leaks.
 */

/** The session user, or a 401 if signed out. */
export async function requireUser(
  context: Readonly<RouterContextProvider>,
): Promise<SessionUser> {
  const user = await context.get(servicesContext).auth.currentUser();
  if (!user) throw new UnauthorizedException().toResponse();
  return user;
}

/** The team if the user belongs to it, or a 403. Returns the full `Team` DTO so
 * callers don't re-fetch it. */
export async function requireTeamMember(
  context: Readonly<RouterContextProvider>,
  teamId: string,
): Promise<Team> {
  const teams = await context.get(servicesContext).teams.list();
  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new ForbiddenException().toResponse();
  return team;
}
