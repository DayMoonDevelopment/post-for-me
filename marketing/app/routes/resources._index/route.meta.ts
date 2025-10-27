import type { MetaDescriptor } from "react-router";
import { MetadataComposer } from "~/lib/meta";
import { buildResourcesBreadcrumbs } from "~/lib/utils";
import type { Route } from "./+types/route";

/**
 * Meta function for the main Resources index page.
 * Interprets business data from loader and generates comprehensive SEO metadata.
 */
export const meta: Route.MetaFunction = ({
  data,
  matches,
}): MetaDescriptor[] => {
  if (!data) return [];

  const siteUrl = data.siteUrl || "https://postfor.me";

  // Interpret business data for SEO purposes
  const title = "API Integration Resources - Post For Me";
  const description =
    "Developer guides for TikTok, Instagram, Facebook, LinkedIn, and X APIs. Learn auth, endpoints, and best practices for social media automation.";
  const canonical = `${siteUrl}/resources`;

  // Extract posts data from parent loader for ItemList schema
  const parentMatch = matches.find((match) => match?.id === "routes/resources");
  const parentData = parentMatch?.data as { posts?: any[] } | undefined;
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
      "applicationCategory": "DeveloperApplication",
      "name": "Social Media API Integration"
    },
    hasPart: [
      {
        "@type": "WebPage",
        "name": "Social Media Platforms",
        "url": `${siteUrl}/resources/social-media-platforms`
      },
      {
        "@type": "WebPage",
        "name": "API Authentication",
        "url": `${siteUrl}/resources/authentication`
      },
      {
        "@type": "WebPage",
        "name": "Integration Guides",
        "url": `${siteUrl}/resources/guides`
      }
    ],
    totalItems: Array.isArray(posts) ? posts.length : undefined,
  });
  metadata.addSchema(collectionPageSchema);

  // Add ItemList schema if we have posts data available
  if (Array.isArray(posts) && posts.length > 0) {
    const itemListSchema = metadata.createItemListSchema({
      title: "API Integration Guides and Tutorials",
      description: "Step-by-step guides for integrating social media APIs",
      items: posts.slice(0, 10).map((post: any) => ({
        name: post.title || "Untitled Guide",
        description: post.summary || post.description,
        url: `${siteUrl}/resources/${post.category?.slug || "general"}/${post.slug}`,
        datePublished: post.created_at,
        image: post.coverImage,
      })),
    });
    metadata.addSchema(itemListSchema);
  }

  // Add FAQ schema for resources landing page
  const faqSchema = metadata.createFAQSchema({
    id: `${siteUrl}/resources#faq`,
    questions: [
      {
        question: "What is Post for Me?",
        answer: "Post for Me is a social media automation API that enables developers to programmatically post content to TikTok, Instagram, Facebook, LinkedIn, and X (Twitter). Our API handles authentication, media processing, and content distribution across multiple platforms."
      },
      {
        question: "What social media platforms does Post for Me support?",
        answer: "Post for Me supports TikTok, Instagram, Facebook, LinkedIn, and X (Twitter). Our API provides unified endpoints for posting to all these platforms, handling platform-specific requirements and authentication flows."
      },
      {
        question: "How do I get started with the Post for Me API?",
        answer: "Start by signing up for a Post for Me account and obtaining your API key. Then explore our developer resources which include authentication guides, API documentation, code examples, and integration tutorials for each supported platform."
      },
      {
        question: "What types of content can I post through the API?",
        answer: "You can post text, images, videos, and mixed media content. Our API handles media processing, format conversion, and platform-specific optimizations automatically. Each platform has specific content requirements which our documentation covers in detail."
      },
      {
        question: "Is there rate limiting on the Post for Me API?",
        answer: "Yes, the API implements rate limiting to ensure fair usage and compliance with social platform policies. Rate limits vary by plan and platform. Check our API documentation for specific limits and best practices for handling rate limit responses."
      },
      {
        question: "Do you provide SDKs or just REST APIs?",
        answer: "We provide both REST APIs and official SDKs for popular programming languages including JavaScript/Node.js, Python, PHP, and others. Our developer resources include code examples and integration guides for each SDK."
      }
    ]
  });
  metadata.addSchema(faqSchema);

  return metadata.build();
};
