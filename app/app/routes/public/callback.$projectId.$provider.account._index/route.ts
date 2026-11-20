export { Component as default } from "./route.component";
// White Label OAuth callback. The loader completes the token-exchange and either
// redirects to the customer's auth_callback_url or returns the branded fallback
// data rendered by the shared ConnectionResult component.
export { loader } from "./route.loader";
