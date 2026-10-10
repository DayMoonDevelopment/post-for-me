import { useMatches } from "react-router";

/**
 * The project the current route belongs to, read from the URL.
 *
 * Project-scoped pages carry it as `params.projectId` (`/projects/:projectId/…`).
 * Prefix-less resource pages (`/social-accounts/:id`, `/social-posts/:id`,
 * `/social-post-results/:id`) have no such param, so their loaders publish the
 * owning project as `data.projectId` instead. Reading BOTH keeps the sidebar's
 * active-project context correct on every route that renders it — resolving only
 * `params` silently drops to the first project on the prefix-less pages, which is
 * the wrong team/project. The deepest match wins.
 *
 * Returns `undefined` when no match supplies a project (e.g. the bare entry `/`).
 *
 * Every shell consumer (both sidebars' nav links and the `ContextSwitcher`
 * header) shares this so their notion of "active project" can never drift apart
 * again.
 */
export function useRouteProjectId(): string | undefined {
  const matches = useMatches();
  return matches
    .map(
      (match) =>
        (match.params as { projectId?: string }).projectId ??
        (match.loaderData as { projectId?: string } | undefined)?.projectId,
    )
    .filter(Boolean)
    .at(-1);
}
