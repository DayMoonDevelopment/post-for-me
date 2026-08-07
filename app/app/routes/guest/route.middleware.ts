import { redirect } from "react-router";

import { servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ context }) => {
    const user = await context.get(servicesContext).auth.currentUser();
    if (user) {
      throw redirect("/");
    }
  },
];
