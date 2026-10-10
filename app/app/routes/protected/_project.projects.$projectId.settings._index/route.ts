export { action } from "./route.action";
export { Component as default } from "./route.component";
// projects/:projectId/settings — the project config page. Its loader + action
// are the single mutation surface shared with the project-setup modal.
export { loader } from "./route.loader";
