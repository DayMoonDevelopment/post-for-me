import { useMatches } from "react-router";

/**
 * The team the current route belongs to, read from the deepest match that
 * supplies one — a `teamId` URL param (`/teams/$teamId/billing`) or a `teamId`
 * published by a loader.
 *
 * The team-scoped counterpart to `useRouteProjectId`. Team-scoped pages carry no
 * `projectId`, so deriving the active team from the active project silently
 * falls back to the FIRST team on exactly those pages — meaning the org
 * switcher and the Billing link would both point at the wrong team while you're
 * looking at another one's billing.
 *
 * Returns `undefined` when no match supplies a team (project pages, the bare
 * entry `/`), leaving callers to fall back to the active project's team.
 */
export function useRouteTeamId(): string | undefined {
  const matches = useMatches();
  return matches
    .map(
      (match) =>
        (match.params as { teamId?: string }).teamId ??
        (match.loaderData as { teamId?: string } | undefined)?.teamId,
    )
    .filter(Boolean)
    .at(-1);
}
