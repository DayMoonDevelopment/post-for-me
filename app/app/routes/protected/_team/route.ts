export { Component as default, ErrorBoundary } from "./route.component";
// The TEAM app shell — the sibling of `_project` for pages whose context is a
// TEAM rather than a project (billing today; members/settings when they land).
// Entered only with an authenticated user (gated by the parent `protected`
// group). UI pages live under this pathless layout (`_team.*`); data/action
// routes sit at the group root so they don't load this shell. The
// `ErrorBoundary` keeps the chrome for page-level errors.
//
// The chrome itself is `~/components/shell` (`AppShell` + parts), shared with
// `_project`; this layout supplies only the team-context nav.
export { loader } from "./route.loader";
