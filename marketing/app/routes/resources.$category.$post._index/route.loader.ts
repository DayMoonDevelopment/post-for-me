import { data } from "react-router";

import { MarbleCMS } from "~/lib/.server/marble";

export async function loader({
  params,
  request,
}: {
  params: any;
  request: Request;
}) {
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

  // Get site name from request host
  const url = new URL(request.url);
  const siteName = url.hostname;

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
    seo_meta: {
      title: marblePost.title,
      description: marblePost.description,
      keywords: marblePost.tags.map((tag) => tag.name).join(", "),
    },

    // Site info
    siteName,
    siteUrl: `${url.protocol}//${url.host}`,

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
