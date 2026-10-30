export { Component as default } from "./route.component";
// projects/:projectId/social-posts — the project's posts list. Loader parses the
// URL into list params (server-driven grid); posts are read-only here, so there's
// no action — row click opens the post detail page.
export { loader } from "./route.loader";
