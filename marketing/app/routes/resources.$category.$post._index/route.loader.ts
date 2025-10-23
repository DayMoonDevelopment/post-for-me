import { data } from "react-router";

import { MarbleCMS } from "~/lib/.server/marble";

import type { Route } from "./+types/route";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { post } = params;

  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }

  const marble = new MarbleCMS();
  const postData = await marble.getSinglePost(post);

  if (!postData?.post) {
    throw new Response("Not Found", { status: 404 });
  }

  const { post: marblePost } = postData;
  const url = new URL(request.url);

  return data({
    // Post data from Marble CMS
    title: marblePost.title,
    summary: marblePost.description,
    slug: marblePost.slug,
    created_at: marblePost.publishedAt,
    updated_at: marblePost.updatedAt,
    content: marblePost.content, // Content is already HTML from Marble
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

    // Breadcrumb data - return both category and post breadcrumbs
    breadcrumb: [
      {
        title: marblePost.category.name,
        href: `/resources/${marblePost.category.slug}`,
      },
      {
        title: marblePost.title,
        href: null, // This is the current page
      },
    ],
  });
}
