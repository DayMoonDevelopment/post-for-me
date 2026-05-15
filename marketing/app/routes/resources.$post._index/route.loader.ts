import { data } from "react-router";

import { CMS } from "~/lib/.server/cms";

import type { Route } from "./+types/route";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { post: postSlug } = params;

  if (!postSlug) {
    throw new Response("Not Found", { status: 404 });
  }

  const cms = new CMS();

  // Look up post by slug
  const postData = await cms.post(postSlug).get();

  if (!postData?.post || postData.post.category.slug !== "resources") {
    throw new Response("Not Found", { status: 404 });
  }

  const { post: articlePost } = postData;
  const url = new URL(request.url);

  return data({
    title: articlePost.title,
    summary: articlePost.description,
    slug: articlePost.slug,
    created_at: articlePost.publishedAt,
    updated_at: articlePost.updatedAt,
    coverImage: articlePost.coverImage,
    authors: articlePost.authors,
    category: articlePost.category,
    tags: articlePost.tags,
    attribution: articlePost.attribution,
    siteUrl: `${url.protocol}//${url.host}`,
    siteName: url.hostname,
    seo_meta: {
      title: articlePost.title,
      description: articlePost.description,
      keywords: articlePost.tags.map((tag) => tag.name).join(", "),
    },
    content: articlePost.content,
  });
}
