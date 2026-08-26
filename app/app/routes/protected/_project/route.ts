export { Component as default, ErrorBoundary } from "./route.component";
// The PROJECT app shell — pages whose context is a project (playground,
// accounts, posts, API keys, webhooks, settings). Entered only with an
// authenticated user (gated by the parent `protected` group). UI pages live
// under this pathless layout (`_project.*`); data/action routes sit at the group
// root so they don't load this shell. The `ErrorBoundary` keeps the chrome for
// page-level errors.
//
// The chrome itself is `~/components/shell` (`AppShell` + parts), shared with
// `_team`; this layout supplies only the project-context nav and the onboarding
// provider that wraps it.
export { loader } from "./route.loader";
