// Access-control gate for the `protected` group. Auth middleware only — no UI.
// A route module with no default component renders its children through a
// default <Outlet>, so this layer purely gates everything in the group while
// the presentation-specific layers (_project, _team, future _chromeless) supply
// chrome — one per context a page operates in (project / team / none).
export { middleware } from "./route.middleware";
