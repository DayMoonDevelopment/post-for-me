import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const canonicalUrl = "https://www.postforme.dev/social-media/analytics";
  const title = "Social Media Analytics API — Post for Me";
  const description =
    "Retrieve post-level analytics from TikTok, Instagram, Facebook, X, LinkedIn, and more through one API. Track impressions, engagement, and reach.";

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
      content: "Social Media Analytics API — Post for Me",
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
        "social media analytics API, post analytics API, social media engagement API, track social media performance, post impressions API, social media metrics API, TikTok analytics API, Instagram analytics API, Facebook analytics API, unified social analytics",
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
            item: "https://www.postforme.dev/social-media",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Analytics",
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
            name: "What analytics data does Post for Me provide?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Post for Me provides post-level analytics including impressions, reach, engagement, likes, comments, shares, and saves. All metrics are normalized across platforms into a consistent response format.",
            },
          },
          {
            "@type": "Question",
            name: "Is this account-level analytics?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Post for Me provides analytics at the individual post level, not account-level metrics. You get performance data for specific posts across any connected account.",
            },
          },
          {
            "@type": "Question",
            name: "Which platforms support post analytics?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Post analytics are available across all 9 supported platforms: TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube. All platforms return metrics in the same unified format.",
            },
          },
          {
            "@type": "Question",
            name: "Can I track engagement over time?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You can retrieve analytics for any post at any point after publishing. Fetch metrics repeatedly to track how engagement changes over time and build performance trend views in your product.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need platform credentials to access analytics?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Post for Me provides managed OAuth credentials so you can start retrieving analytics immediately. Bring your own credentials when you're ready for production.",
            },
          },
        ],
      },
    },
  ];
};
