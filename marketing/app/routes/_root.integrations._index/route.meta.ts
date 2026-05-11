import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const canonicalUrl = "https://www.postforme.dev/integrations";

  return [
    {
      title: "Platform Integrations — Post for Me Social Media API",
    },
    {
      name: "description",
      content:
        "Connect to TikTok, Instagram, Facebook, X, LinkedIn, YouTube, Pinterest, Threads, and Bluesky through one unified API. Post, schedule, and track across every platform.",
    },
    { rel: "canonical", href: canonicalUrl },

    // Open Graph
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Platform Integrations — Post for Me Social Media API",
    },
    {
      property: "og:description",
      content:
        "Connect to TikTok, Instagram, Facebook, X, LinkedIn, YouTube, Pinterest, Threads, and Bluesky through one unified API. Post, schedule, and track across every platform.",
    },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },
    {
      property: "og:image:alt",
      content: "Platform Integrations — Post for Me",
    },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Platform Integrations — Post for Me Social Media API",
    },
    {
      name: "twitter:description",
      content:
        "Connect to TikTok, Instagram, Facebook, X, LinkedIn, YouTube, Pinterest, Threads, and Bluesky through one unified API.",
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/og-image.png",
    },

    // Keywords
    {
      name: "keywords",
      content:
        "social media API, social media integrations, TikTok API, Facebook API, Instagram API, X API, Twitter API, LinkedIn API, Pinterest API, Bluesky API, Threads API, YouTube API, unified social API, posting API, social media developer tools",
    },

    // Structured Data — CollectionPage with ItemList
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Platform Integrations",
        description:
          "Connect to all major social platforms through the Post for Me unified API.",
        url: canonicalUrl,
        about: { "@id": "https://www.postforme.dev/#product" },
        isPartOf: { "@id": "https://www.postforme.dev/#website" },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: 9,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "TikTok",
              url: "https://www.postforme.dev/integrations/tiktok",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Facebook",
              url: "https://www.postforme.dev/integrations/facebook",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Instagram",
              url: "https://www.postforme.dev/integrations/instagram",
            },
            {
              "@type": "ListItem",
              position: 4,
              name: "X (Twitter)",
              url: "https://www.postforme.dev/integrations/x",
            },
            {
              "@type": "ListItem",
              position: 5,
              name: "LinkedIn",
              url: "https://www.postforme.dev/integrations/linkedin",
            },
            {
              "@type": "ListItem",
              position: 6,
              name: "Pinterest",
              url: "https://www.postforme.dev/integrations/pinterest",
            },
            {
              "@type": "ListItem",
              position: 7,
              name: "Bluesky",
              url: "https://www.postforme.dev/integrations/bluesky",
            },
            {
              "@type": "ListItem",
              position: 8,
              name: "Threads",
              url: "https://www.postforme.dev/integrations/threads",
            },
            {
              "@type": "ListItem",
              position: 9,
              name: "YouTube",
              url: "https://www.postforme.dev/integrations/youtube",
            },
          ],
        },
      },
    },

    // BreadcrumbList
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
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
            name: "Integrations",
            item: canonicalUrl,
          },
        ],
      },
    },
  ];
};
