import { solutions } from "~/lib/.server/data/solutions";

import type { Route } from "./+types/route";

export async function loader(_args: Route.LoaderArgs) {
  // Convert solutions object to array for easier rendering
  const solutionsList = Object.values(solutions);

  return { solutions: solutionsList };
}
