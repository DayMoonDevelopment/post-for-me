export { action } from "./route.action";
export { Component as default } from "./route.component";
// projects/:projectId/social-accounts — the project's connected accounts list.
// Loader parses the URL into list params (server-driven grid); action handles
// the row-level disconnect/delete mutations.
export { loader } from "./route.loader";
