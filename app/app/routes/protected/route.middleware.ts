import { redirect } from "react-router";

import { currentUserContext, servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

// The single auth gate for everything under `_protected`. Resolves the current
// user through the auth port, redirects guests to /login, and publishes the
// resolved principal into `currentUserContext` so downstream loaders/actions
// consume it instead of re-deriving (or re-checking) identity.
export const middleware: Route.MiddlewareFunction[] = [
  async ({ context }) => {
    const user = await context.get(servicesContext).auth.currentUser();
    if (!user) {
      throw redirect("/login");
    }
    context.set(currentUserContext, user);
  },
];
