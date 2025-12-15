import { data } from "react-router";
import { MarbleCMS } from "~/lib/.server/marble";

import type { Route } from "./+types/route";

export async function loader(_args: Route.LoaderArgs) {
  const marble = new MarbleCMS();

  // Critical data: Load tags immediately for sidebar navigation
  const tagsResponse = await marble.getTags();

  // Non-critical data: Defer posts loading to speed up initial render
  const postsPromise = marble.getPosts().then(response => {
    // Filter posts to only include those in "resources" category
    const posts = response?.posts || [];
    return posts.filter(post => post.category.slug === "resources");
  });

  return data({
    tags: tagsResponse?.tags || [],
    posts: postsPromise, // Return as promise for deferred loading
  });
}
