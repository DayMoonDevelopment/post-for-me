// callback/teams/:teamId — a gate-only layout for the team-scoped callbacks.
// No component and no loader: it exists purely so `route.middleware` runs for
// every child (see the middleware for why). Children render through it
// unchanged.
export { middleware } from "./route.middleware";
