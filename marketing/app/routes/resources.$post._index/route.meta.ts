import { MetadataComposer } from "~/lib/meta";

import type { Route } from "./+types/route";
import type { MetaDescriptor } from "react-router";

/**
 * Estimate reading time based on word count
 * Average reading speed: 200 words per minute
 */
function estimateReadingTime(wordCount: number): string {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `PT${minutes}M`; // ISO 8601 duration format
}

/**
 * Estimate word count from content length
 * Average word length: 5 characters + 1 space = 6 characters per word
 */
function estimateWordCount(contentLength: number): number {
  return Math.round(contentLength / 6);
}

/**
 * Determine proficiency level based on title and summary content
 */
function determineProficiencyLevel(title: string, summary: string): string {
  const content = `${title} ${summary}`.toLowerCase();

  if (
    content.includes("getting started") ||
    content.includes("beginner") ||
    content.includes("introduction") ||
    content.includes("basics")
  ) {
    return "Beginner";
  }
  if (
    content.includes("advanced") ||
    content.includes("expert") ||
    content.includes("deep dive") ||
    content.includes("optimization")
  ) {
    return "Advanced";
  }
  return "Intermediate";
}

/**
 * Generate dependencies based on category and content
 */
function generateDependencies(categoryName: string, title: string): string[] {
  const dependencies = [
    `${categoryName} account and API credentials`,
    "Basic understanding of REST APIs",
    "Development environment setup",
  ];

  const titleLower = title.toLowerCase();
  if (titleLower.includes("oauth") || titleLower.includes("authentication")) {
    dependencies.push("Understanding of OAuth 2.0 flow");
  }
  if (titleLower.includes("webhook") || titleLower.includes("callback")) {
    dependencies.push("Web server capable of receiving webhooks");
  }

  return dependencies;
}

/**
 * Meta function for individual post pages.
 * Interprets business data from loader and generates comprehensive SEO metadata.
 */
export const meta: Route.MetaFunction = ({ data }): MetaDescriptor[] => {
  if (!data) return [];

  const siteUrl = data.siteUrl || "https://www.postforme.dev";

  // Interpret business data for SEO purposes
  const title = `${data.title} - ${data.category?.name} API Integration Guide`;
  const description =
    data.summary ||
    `Learn how to integrate ${data.category?.name} API with step-by-step instructions, code examples, and best practices for developers.`;
  const canonical = `${siteUrl}/resources/${data.category?.slug}/${data.slug}`;

  // Extract tags for keywords
  const tags = data.tags?.map((tag: { name: string }) => tag.name) || [];
  const categoryName = data.category?.name || "";

  // Estimate word count and reading time from content
  const contentLength = data.summary?.length || 0;
  const wordCount = estimateWordCount(contentLength + 2000); // Add estimated content length
  const readingTime = estimateReadingTime(wordCount);

  // Determine proficiency level and dependencies
  const proficiencyLevel = determineProficiencyLevel(
    data.title,
    data.summary || "",
  );
  const dependencies = generateDependencies(categoryName, data.title);

  const metadata = new MetadataComposer();
  metadata.siteUrl = siteUrl;
  metadata.title = title;
  metadata.description = description;
  metadata.canonical = canonical;
  if (data.coverImage) {
    metadata.image = data.coverImage;
  }
  metadata.contentType = "website"; // Using website to prevent auto Article schema (we have TechArticle)
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

  // Set breadcrumbs with proper URLs for all items
  const breadcrumbs = [
    { title: "Resources", href: "/resources" },
    {
      title: data.category?.name || "Category",
      href: `/resources/${data.category?.slug}`,
    },
    { title: data.title, href: null }, // Current page
  ];
  metadata.setBreadcrumbs(breadcrumbs);

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
    inLanguage: "en-US",
    wordCount: wordCount,
    timeRequired: readingTime,
    articleBody: description, // Full article content for LLM understanding
    encodingFormat: "text/html",
    articleSection: `${categoryName} API Integration`,
    proficiencyLevel: proficiencyLevel,
    dependencies: dependencies,
    skillLevel: proficiencyLevel.toLowerCase(),
    image: data.coverImage ? [{ url: data.coverImage }] : undefined,
    thumbnailUrl: data.coverImage,
    author: data.authors?.[0]?.name
      ? {
          "@type": "Person",
          name: data.authors[0].name,
          jobTitle: "Founder",
          url: `https://daymoon.dev/${data.authors[0].name.toLowerCase().replace(/\s+/g, "-")}`,
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
    about: [
      {
        "@type": "SoftwareApplication",
        name: `${categoryName} API`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
      },
      {
        "@type": "SoftwareApplication",
        name: "Post For Me",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
      },
    ],
    ...(tags.length > 0 && { keywords: tags }),
    isAccessibleForFree: true,
    learningResourceType: "Tutorial",
  };
  metadata.addSchema(techArticleSchema);

  return metadata.build();
};
