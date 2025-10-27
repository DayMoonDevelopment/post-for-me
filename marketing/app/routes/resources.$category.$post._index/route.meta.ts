import type { MetaDescriptor } from "react-router";
import { MetadataComposer } from "~/lib/meta";
import { buildResourcesBreadcrumbs } from "~/lib/utils";
import type { Route } from "./+types/route";

/**
 * Meta function for individual post pages.
 * Interprets business data from loader and generates comprehensive SEO metadata.
 */
export const meta: Route.MetaFunction = ({ data }): MetaDescriptor[] => {
  if (!data) return [];

  const siteUrl = data.siteUrl || "https://postfor.me";

  // Interpret business data for SEO purposes
  const title = `${data.title} - ${data.category?.name} API Integration Guide`;
  const description =
    data.summary ||
    `Learn how to integrate ${data.category?.name} API with step-by-step instructions, code examples, and best practices for developers.`;
  const canonical = `${siteUrl}/resources/${data.category?.slug}/${data.slug}`;

  // Extract tags for keywords
  const tags = data.tags?.map((tag: any) => tag.name) || [];
  const categoryName = data.category?.name || "";

  const metadata = new MetadataComposer();
  metadata.siteUrl = siteUrl;
  metadata.title = title;
  metadata.description = description;
  metadata.canonical = canonical;
  metadata.image = data.coverImage;
  metadata.contentType = "article";
  metadata.keywords =
    `${categoryName} API, ${categoryName} integration, ${categoryName} authentication, API documentation, developer guide, OAuth 2.0, REST API, webhook integration, rate limiting, API tutorial, ${tags.join(", ")}`.replace(
      /^, |, $/,
      "",
    );

  // Article-specific properties
  if (data.created_at) {
    metadata.publishedTime = new Date(data.created_at).toISOString();
  }
  if (data.updated_at) {
    metadata.modifiedTime = new Date(data.updated_at).toISOString();
  }
  if (data.authors?.[0]?.name) {
    metadata.author = data.authors[0].name;
  }

  metadata.setBreadcrumbs(
    buildResourcesBreadcrumbs(
      data.category?.name,
      data.category?.slug,
      data.title,
    ),
  );

  // Add TechArticle schema for enhanced SEO
  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": canonical,
    headline: data.title,
    description: description,
    url: canonical,
    datePublished: data.created_at
      ? new Date(data.created_at).toISOString()
      : undefined,
    dateModified: data.updated_at
      ? new Date(data.updated_at).toISOString()
      : undefined,
    inLanguage: "en",
    image: data.coverImage ? [{ url: data.coverImage }] : undefined,
    author: data.authors?.[0]?.name
      ? {
          "@type": "Person",
          name: data.authors[0].name,
        }
      : {
          "@type": "Organization",
          name: "Post For Me",
          url: siteUrl,
        },
    publisher: {
      "@type": "Organization",
      name: "Post For Me",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    isPartOf: {
      "@type": "CollectionPage",
      "@id": `${siteUrl}/resources/${data.category?.slug}`,
      name: data.category?.name,
    },
    about: {
      "@type": "SoftwareApplication",
      applicationCategory: "DeveloperApplication",
      name: `${categoryName} API Integration`,
    },
    ...(tags.length > 0 && { keywords: tags }),
    isAccessibleForFree: true,
    learningResourceType: "Tutorial",
  };
  metadata.addSchema(techArticleSchema);

  return metadata.build();
};
