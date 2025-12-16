import { MarbleCMS } from "~/lib/.server/marble";

import type { MarblePostListResponse } from "~/lib/.server/marble.types";
import type { Route } from "./+types/route";

export async function loader(_args: Route.LoaderArgs) {
  const marble = new MarbleCMS();
  const data = (await marble.fetch(
    "posts?category=resources&tags=social-media-platforms",
  )) as MarblePostListResponse;

  const posts = data?.posts || [];

  // Sort posts: featured = true first, then the rest
  // Adjust the property name if it's different (e.g., featured: true, isFeatured, etc.)
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.featured === true && b.featured !== true) return -1;
    if (a.featured !== true && b.featured === true) return 1;
    return 0; // Maintain original order for equal featured status
  });

  return {
    featuredResources: sortedPosts,
  };
}
