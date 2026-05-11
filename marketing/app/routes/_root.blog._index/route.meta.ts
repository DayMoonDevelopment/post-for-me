import { MetadataComposer } from "~/lib/meta";

import type { Route } from "./+types/route";

export function meta({ data }: Route.MetaArgs) {
  const metadata = new MetadataComposer();
  metadata.title = "Blog - Post For Me";
  metadata.description =
    "Technical guides, integration tutorials, and insights for developers building social media automation. Learn how to integrate with TikTok, Facebook, Instagram, X, LinkedIn, and more.";
  metadata.canonical = "https://www.postforme.dev/blog";

  // Add Collection Page schema
  const collectionSchema = metadata.createCollectionPageSchema({
    title: "Post For Me Blog",
    description:
      "Technical guides and tutorials for social media API integration",
    canonical: "https://www.postforme.dev/blog",
  });

  // Add ItemList schema for blog posts
  if (data?.posts && data.posts.length > 0) {
    const itemListSchema = metadata.createItemListSchema({
      title: "Post For Me Blog",
      description:
        "Technical guides and tutorials for social media API integration",
      items: data.posts.map((post) => ({
        name: post.title,
        description: post.description,
        url: `https://www.postforme.dev/blog/${post.slug}`,
        datePublished: post.publishedAt.toISOString(),
        image: post.coverImage || undefined,
      })),
    });

    metadata.addSchema(itemListSchema);
  }

  metadata.addSchema(collectionSchema);

  return metadata.build();
}
