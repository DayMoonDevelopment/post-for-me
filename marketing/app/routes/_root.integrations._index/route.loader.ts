import { integrations } from "~/lib/.server/data/integrations";

import type { Route } from "./+types/route";

export async function loader(_args: Route.LoaderArgs) {
  const integrationsList = Object.values(integrations);

  return { integrations: integrationsList };
}
