import type { MetaDescriptor } from "react-router";
import { MetadataComposer } from "~/lib/meta";
import { buildResourcesBreadcrumbs } from "~/lib/utils";
import type { Route } from "./+types/route";

/**
 * Meta function for category index pages.
 * Interprets business data from loader and generates comprehensive SEO metadata.
 */
export const meta: Route.MetaFunction = ({ data }): MetaDescriptor[] => {
  if (!data) return [];

  const siteUrl = data.siteUrl || "https://postfor.me";

  // Interpret business data for SEO purposes
  const categoryName = data.category?.name || "Category";
  const title = `${categoryName} API Integration Resources - Post For Me`;
  const description =
    data.category?.description ||
    `Developer guides and tutorials for ${categoryName} API integration, authentication, and best practices. Learn OAuth flows, endpoints, and implementation examples.`;
  const canonical = `${siteUrl}/resources/${data.slug}`;

  // Extract posts data from deferred loader
  const posts = Array.isArray(data.posts) ? data.posts : [];

  const metadata = new MetadataComposer();
  metadata.siteUrl = siteUrl;
  metadata.title = title;
  metadata.description = description;
  metadata.canonical = canonical;
  metadata.contentType = "website";
  metadata.keywords = `${categoryName} API, ${categoryName} integration, ${categoryName} authentication, social media API, REST API, OAuth 2.0, API documentation, developer guides, integration tutorials, API best practices, webhook integration, rate limiting`;
  metadata.modifiedTime = data.updated_at;

  metadata.setBreadcrumbs(buildResourcesBreadcrumbs(categoryName, data.slug));

  // Add CollectionPage schema for the category
  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": canonical,
    "name": categoryName, // Clean, short name for schema
    "description": description,
    "url": canonical,
    "dateModified": data.updated_at,
    "datePublished": data.created_at || data.updated_at,
    "inLanguage": "en",
    "isPartOf": {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/resources`,
      "name": "Resources"
    },
    "about": {
      "@type": "SoftwareApplication",
      "applicationCategory": "DeveloperApplication",
      "name": `${categoryName} API Integrations`
    },
    "mainEntity": {
      "@id": `${canonical}#articles`
    },
    ...(posts.length > 0 && { "numberOfItems": posts.length })
  };
  metadata.addSchema(collectionPageSchema);

  // Add ItemList schema if we have posts data available
  if (Array.isArray(posts) && posts.length > 0) {
    const itemListSchema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${canonical}#articles`,
      "name": `${categoryName} Integration Guides`,
      "description": `Step-by-step guides for ${categoryName} API integration`,
      "numberOfItems": posts.length,
      "itemListElement": posts.map((post: { title?: string; summary?: string; description?: string; slug: string; created_at?: string; updated_at?: string; coverImage?: string }, index: number) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "TechArticle",
          "name": post.title || "Untitled Guide",
          "description": post.summary || post.description,
          "url": `${siteUrl}/resources/${data.slug}/${post.slug}`,
          ...(post.created_at && { "datePublished": post.created_at }),
          ...(post.updated_at && { "dateModified": post.updated_at }),
          ...(post.coverImage && { "image": post.coverImage })
        }
      }))
    };
    metadata.addSchema(itemListSchema);
  }

  return metadata.build();
};
