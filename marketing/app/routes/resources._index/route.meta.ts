import { MetadataComposer } from "~/lib/meta";
import { buildResourcesBreadcrumbs } from "~/lib/utils";

import type { Route } from "./+types/route";
import type { MetaDescriptor } from "react-router";

/**
 * Meta function for the main Resources index page.
 * Interprets business data from loader and generates comprehensive SEO metadata.
 */
export const meta: Route.MetaFunction = ({
  data,
  matches,
}): MetaDescriptor[] => {
  if (!data) return [];

  const siteUrl = data.siteUrl || "https://www.postforme.dev";

  // Interpret business data for SEO purposes
  const title = "API Integration Resources - Post For Me";
  const description =
    "Developer guides for TikTok, Instagram, Facebook, LinkedIn, and X APIs. Learn auth, endpoints, and best practices for social media automation.";
  const canonical = `${siteUrl}/resources`;

  // Extract posts data from parent loader for ItemList schema
  const parentMatch = matches.find((match) => match?.id === "routes/resources");
  const parentData = parentMatch?.data as
    | {
        posts?: {
          title?: string;
          summary?: string;
          description?: string;
          slug: string;
          created_at?: string;
          category?: { slug: string };
          coverImage?: string;
        }[];
      }
    | undefined;
  const posts = parentData?.posts || [];

  const metadata = new MetadataComposer();
  metadata.siteUrl = siteUrl;
  metadata.title = title;
  metadata.description = description;
  metadata.canonical = canonical;
  metadata.contentType = "website";
  metadata.keywords =
    "social media API, posting API, scheduling API, developer social API, TikTok API, Instagram API, Facebook API, X API, LinkedIn API, OAuth 2.0, REST API, webhook integration, rate limiting, API authentication, social media SDK, API documentation, integration guides, developer resources";
  metadata.modifiedTime = data.updated_at;
  metadata.imageWidth = 1200;
  metadata.imageHeight = 630;

  metadata.setBreadcrumbs(buildResourcesBreadcrumbs());

  // Add CollectionPage schema for the resources listing
  const collectionPageSchema = metadata.createCollectionPageSchema({
    title,
    description,
    canonical,
    dateModified: data.updated_at,
    datePublished: data.created_at || data.updated_at,
    about: {
      "@type": "SoftwareApplication",
      applicationCategory: "DeveloperApplication",
      name: "Social Media API Integration",
    },
    hasPart: [
      {
        "@type": "WebPage",
        name: "Social Media Platforms",
        url: `${siteUrl}/resources/social-media-platforms`,
      },
      {
        "@type": "WebPage",
        name: "API Authentication",
        url: `${siteUrl}/resources/authentication`,
      },
      {
        "@type": "WebPage",
        name: "Integration Guides",
        url: `${siteUrl}/resources/guides`,
      },
    ],
    totalItems: Array.isArray(posts) ? posts.length : undefined,
  });
  metadata.addSchema(collectionPageSchema);

  // Add ItemList schema if we have posts data available
  if (Array.isArray(posts) && posts.length > 0) {
    const itemListSchema = metadata.createItemListSchema({
      title: "API Integration Guides and Tutorials",
      description: "Step-by-step guides for integrating social media APIs",
      items: posts.slice(0, 10).map((post) => ({
        name: post.title || "Untitled Guide",
        description: post.summary || post.description,
        url: `${siteUrl}/resources/${post.category?.slug || "general"}/${post.slug}`,
        datePublished: post.created_at,
        image: post.coverImage,
      })),
    });
    metadata.addSchema(itemListSchema);
  }

  return metadata.build();
};
