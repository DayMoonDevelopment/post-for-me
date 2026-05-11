import { NavigationManager } from "~/lib/.server/navigation-manager";

import type { Route } from "./+types/route";

export async function loader(_args: Route.LoaderArgs) {
  try {
    const navigationManager = new NavigationManager();
    return await navigationManager.getLoaderData();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Navigation loader failed (missing env vars?):", error);
      return {
        featuredResources: [],
        solutionPreviews: [],
      };
    }
    throw error;
  }
}
