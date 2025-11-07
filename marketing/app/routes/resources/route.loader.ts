import { data } from "react-router";
import { MarbleCMS } from "~/lib/.server/marble";

import type { Route } from "./+types/route";

export async function loader(_args: Route.LoaderArgs) {
  const marble = new MarbleCMS();

  // Critical data: Load categories immediately for sidebar navigation
  const categoriesResponse = await marble.getCategories();

  // Non-critical data: Defer posts loading to speed up initial render
  const postsPromise = marble.getPosts().then(response => response?.posts || []);

  return data({
    categories: categoriesResponse?.categories || [],
    posts: postsPromise, // Return as promise for deferred loading
  });
}
