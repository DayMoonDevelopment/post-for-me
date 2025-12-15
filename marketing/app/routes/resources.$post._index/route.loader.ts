import { data } from "react-router";

import { MarbleCMS } from "~/lib/.server/marble";

import type { Route } from "./+types/route";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { post: postSlug } = params;

  if (!postSlug) {
    throw new Response("Not Found", { status: 404 });
  }

  const marble = new MarbleCMS();

  // Look up post by slug
  const postData = await marble.getSinglePost(postSlug);

  if (!postData?.post) {
    throw new Response("Not Found", { status: 404 });
  }

  const { post: marblePost } = postData;
  const url = new URL(request.url);

  // Defer heavy content parsing for faster initial render
  const contentPromise = Promise.resolve(marblePost.content);

  return data({
    // Critical data: Available immediately for SEO and navigation
    title: marblePost.title,
    summary: marblePost.description,
    slug: marblePost.slug,
    created_at: marblePost.publishedAt,
    updated_at: marblePost.updatedAt,
    coverImage: marblePost.coverImage,
    authors: marblePost.authors,
    category: marblePost.category,
    tags: marblePost.tags,
    attribution: marblePost.attribution,
    siteUrl: `${url.protocol}//${url.host}`,
    siteName: url.hostname,
    seo_meta: {
      title: marblePost.title,
      description: marblePost.description,
      keywords: marblePost.tags.map((tag) => tag.name).join(", "),
    },

    // Non-critical data: Defer content loading
    content: contentPromise,
  });
}
