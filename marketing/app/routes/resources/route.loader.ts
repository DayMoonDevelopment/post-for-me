import { data } from "react-router";

import { CMS } from "~/lib/.server/cms";
import { NavigationManager } from "~/lib/.server/navigation-manager";

import type { Route } from "./+types/route";

export async function loader(_args: Route.LoaderArgs) {
  const cms = new CMS();
  const navigationManager = new NavigationManager();

  // Fetch posts and navigation data in parallel
  const [postsResponse, navigationData] = await Promise.all([
    cms.posts().categories("resources").limit("all").order("desc").get(),
    navigationManager.getLoaderData(),
  ]);

  const posts = postsResponse?.posts || [];

  // Derive unique tags from the posts themselves
  // This is more reliable than the tags endpoint which may return 500 errors
  const tagsMap = new Map();
  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      if (!tagsMap.has(tag.id)) {
        tagsMap.set(tag.id, tag);
      }
    });
  });
  const tags = Array.from(tagsMap.values());

  console.log("Posts in resources category:", posts.length);
  console.log("Tags derived from posts:", tags.length);
  console.log("Tag names:", tags.map((t) => t.name));

  return data({
    tags,
    posts,
    featuredResources: navigationData.featuredResources,
    solutionPreviews: navigationData.solutionPreviews,
  });
}
