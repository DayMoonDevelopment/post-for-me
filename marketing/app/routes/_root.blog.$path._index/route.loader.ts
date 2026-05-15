import { CMS } from "~/lib/.server/cms";

import type { Route } from "./+types/route";

export async function loader({ params }: Route.LoaderArgs) {
  const cms = new CMS();

  // Fetch the specific blog post
  const postResponse = await cms.post(params.path).get();

  if (!postResponse) {
    throw new Response("Blog post not found", { status: 404 });
  }

  const post = postResponse.post;

  // Fetch related posts (recent posts excluding current one, limited to 4)
  const relatedPostsResponse = await cms
    .posts()
    .categories("blog")
    .order("desc")
    .limit(5) // Get 5 to ensure we have 4 after filtering out current post
    .get();

  // Filter out the current post and limit to 4
  const relatedPosts = relatedPostsResponse?.posts
    .filter((p) => p.id !== post.id)
    .slice(0, 4) || [];

  return {
    post,
    relatedPosts,
  };
}
