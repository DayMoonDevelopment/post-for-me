import { CMS } from "~/lib/.server/cms";

import type { Route } from "./+types/route";

export async function loader(_: Route.LoaderArgs) {
  const cms = new CMS();

  // Fetch blog posts with the "blog" category, ordered newest first
  const response = await cms
    .posts()
    .categories("blog")
    .order("desc")
    .limit("all")
    .get();

  if (!response) {
    throw new Response("Failed to fetch blog posts", { status: 500 });
  }

  return {
    posts: response.posts,
    pagination: response.pagination,
  };
}
