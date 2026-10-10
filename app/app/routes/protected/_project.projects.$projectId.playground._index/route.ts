// projects/:projectId/playground — the Posting Playground (PFM-696). The loader lists the
// project's connected accounts as compose targets; authoring is client-side over the registry
// useSocialPostComposer provider. The action uploads picked media then creates the post
// (post-now / scheduled / draft) and redirects to the created post.
export { action } from "./route.action";
export { Component as default } from "./route.component";
export { loader } from "./route.loader";
