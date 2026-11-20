export { action } from "./route.action";
export { Component as default } from "./route.component";
// social-accounts/:socialAccountId — the account detail page (top-level resource
// URL, no /projects prefix). Loader returns the account + NON-SECRET token meta
// (expiry dates + presence); token VALUES are fetched on demand from the
// /api/social-accounts/:id/tokens resource route. The action handles
// disconnect/delete (delete redirects back to the project's accounts list).
export { loader } from "./route.loader";
