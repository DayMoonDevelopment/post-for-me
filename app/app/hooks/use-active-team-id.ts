import { useRouteTeamId } from "~/hooks/use-route-team-id";

/**
 * The team the sidebar should treat as active, resolved once for every consumer.
 *
 * Precedence, and the reason for it:
 *   1. the route's own `teamId` — team-scoped pages (`/teams/$teamId/billing`)
 *      carry no `projectId`, so without this they'd fall through to the first
 *      team and show the wrong org while you're looking at another one's billing;
 *   2. the team owning the active project — the normal case on project pages;
 *   3. the first team — a brand-new user at the bare entry.
 *
 * Every shell consumer (both sidebars' nav links + the context switcher) shares
 * this so their notion of "active team" can never drift apart — the same
 * guarantee `useRouteProjectId` gives for the active project.
 */
export function useActiveTeamId(
  teams: { id: string; projects: { id: string }[] }[],
  activeProjectId: null | string | undefined,
): null | string {
  const routeTeamId = useRouteTeamId();
  if (routeTeamId && teams.some((team) => team.id === routeTeamId)) {
    return routeTeamId;
  }
  const owningTeam = teams.find((team) =>
    team.projects.some((project) => project.id === activeProjectId),
  );
  return owningTeam?.id ?? teams[0]?.id ?? null;
}
