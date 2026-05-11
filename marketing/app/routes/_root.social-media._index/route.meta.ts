import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const canonicalUrl = "https://www.postforme.dev/social-media";
  const title = "Social Media API for Developers — Post for Me";
  const description =
    "Ship social media features in hours. Post, schedule, fetch feeds, and track analytics across 9 platforms with one API. No credentials required to start.";

  return [
    { title },
    { name: "description", content: description },
    { rel: "canonical", href: canonicalUrl },

    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonicalUrl },
    {
      property: "og:image",
      content: "https://www.postforme.dev/og-image.png",
    },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "Social Media API — Post for Me",
    },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/og-image.png",
    },

    // Keywords
    {
      name: "keywords",
      content:
        "social media API, social media posting API, social media scheduling API, social media feeds API, social media analytics API, post to multiple platforms, social media integration, TikTok API, Instagram API, Facebook API, X API, LinkedIn API, unified social API",
    },

    // Structured Data — WebPage
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonicalUrl}/#webpage`,
        name: title,
        description,
        url: canonicalUrl,
        about: { "@id": "https://www.postforme.dev/#product" },
        isPartOf: { "@id": "https://www.postforme.dev/#website" },
        breadcrumb: { "@id": `${canonicalUrl}/#breadcrumb` },
      },
    },

    // BreadcrumbList
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.postforme.dev",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Social Media",
            item: canonicalUrl,
          },
        ],
      },
    },

    // FAQPage structured data
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonicalUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What social media platforms does Post for Me support?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Post for Me supports 9 platforms: TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube. All platforms share the same unified API format.",
            },
          },
          {
            "@type": "Question",
            name: "Can I schedule social media posts through the API?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You can schedule posts for future publishing across any supported platform. Set a publish time in your API call and Post for Me handles the rest, including timezone normalization and platform-specific scheduling constraints.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need my own platform API credentials to get started?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Post for Me provides managed OAuth credentials so you can start building immediately. When you're ready, you can bring your own credentials for full control.",
            },
          },
          {
            "@type": "Question",
            name: "What analytics data is available through the API?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Post for Me provides post-level analytics including impressions, reach, engagement, likes, comments, shares, and saves. Analytics are normalized across platforms into a consistent format.",
            },
          },
          {
            "@type": "Question",
            name: "How does the feeds API work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The feeds API lets you fetch historical content that connected accounts have posted. Retrieve posts in a unified format across all platforms — useful for content auditing, repurposing, and display.",
            },
          },
        ],
      },
    },
  ];
};
