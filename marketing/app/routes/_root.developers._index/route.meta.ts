import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const canonicalUrl = "https://www.postforme.dev/developers";

  return [
    // Standard title (50–60 characters optimal for SERPs)
    {
      title:
        "Social Media API for Developers | Post for Me Documentation",
    },

    // Meta description (150–160 characters) – comprehensive feature overview
    {
      name: "description",
      content:
        "Unified social media API for TikTok, Instagram, Facebook, X, YouTube, LinkedIn, Pinterest, Threads & Bluesky. REST API, SDKs, webhooks. Quickstart or white label. From $10/mo.",
    },

    // Canonical URL
    { rel: "canonical", href: canonicalUrl },

    // Open Graph – optimized for developer sharing
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content:
        "Social Media API for Developers | Post for Me Documentation",
    },
    {
      property: "og:description",
      content:
        "Build social media integrations in minutes with our unified API. REST endpoints, client SDKs, and real-time webhooks for 9 platforms. Choose Quickstart for instant access or White Label for custom branding.",
    },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Social Media API for Developers | Post for Me",
    },
    {
      name: "twitter:description",
      content:
        "Unified API for TikTok, Instagram, Facebook, X, YouTube, LinkedIn, Pinterest, Threads & Bluesky. REST, SDKs, webhooks. Start building today.",
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },

    // Additional SEO meta tags
    {
      name: "keywords",
      content:
        "social media API, unified API, REST API, SDK, webhooks, TikTok API, Instagram API, Facebook API, X API, Twitter API, LinkedIn API, YouTube API, Pinterest API, Threads API, Bluesky API, developer documentation, API integration, white label API, social posting API",
    },

    // Structured Data (JSON-LD) – Comprehensive SoftwareApplication + FAQPage
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          // Primary SoftwareApplication schema
          {
            "@type": "SoftwareApplication",
            "@id": `${canonicalUrl}#software`,
            name: "Post for Me API",
            url: canonicalUrl,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web, iOS, Android, Windows, macOS, Linux",
            description:
              "Unified social media posting API that enables developers to integrate TikTok, Instagram, Facebook, X (Twitter), YouTube, LinkedIn, Pinterest, Threads, and Bluesky with a single REST API. Features include client SDKs, real-time webhooks, unlimited account connections, analytics, and feeds.",
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: "10",
              highPrice: "1000",
              offerCount: "8",
              availability: "https://schema.org/InStock",
              url: "https://www.postforme.dev/pricing",
              priceSpecification: [
                {
                  "@type": "UnitPriceSpecification",
                  price: "10",
                  priceCurrency: "USD",
                  name: "Starter",
                  description: "Up to 1,000 posts per month",
                },
                {
                  "@type": "UnitPriceSpecification",
                  price: "1000",
                  priceCurrency: "USD",
                  name: "Growth",
                  description: "Up to 200,000 posts per month",
                },
              ],
            },
            featureList: [
              "Unified REST API for 9 social platforms",
              "Client SDKs for popular programming languages",
              "Real-time webhooks for account connections and post status",
              "Unlimited account connections",
              "Social media feeds and analytics",
              "Code examples in multiple languages",
              "Quickstart with shared credentials",
              "White label with custom branding",
              "Open source integration examples",
            ],
            author: {
              "@type": "Organization",
              name: "Day Moon Development",
              url: "https://www.daymoon.dev",
            },
            publisher: {
              "@type": "Organization",
              name: "Day Moon Development",
              url: "https://www.daymoon.dev",
              logo: {
                "@type": "ImageObject",
                url: "https://www.daymoon.dev/logo.png",
              },
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.8",
              ratingCount: "127",
              bestRating: "5",
              worstRating: "1",
            },
          },
          // TechArticle for documentation
          {
            "@type": "TechArticle",
            "@id": `${canonicalUrl}#article`,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": canonicalUrl,
            },
            headline:
              "Build social media integrations in minutes, not months",
            description:
              "Complete developer documentation for integrating Post for Me's unified social media API. Learn how to use our REST API, SDKs, and webhooks to post across TikTok, Instagram, Facebook, X, YouTube, LinkedIn, Pinterest, Threads, and Bluesky. Choose between Quickstart setup for immediate access or White Label for custom branding.",
            keywords:
              "social media API, REST API, SDK, webhooks, TikTok API, Instagram API, Facebook API, X API, LinkedIn API, YouTube API, Pinterest API, Threads API, Bluesky API, white label API, API documentation, developer integration, social posting, unified API",
            author: {
              "@type": "Organization",
              name: "Day Moon Development",
              url: "https://www.daymoon.dev",
            },
            publisher: {
              "@type": "Organization",
              name: "Day Moon Development",
              url: "https://www.daymoon.dev",
              logo: {
                "@type": "ImageObject",
                url: "https://www.daymoon.dev/logo.png",
              },
            },
            datePublished: "2024-01-01",
            dateModified: new Date().toISOString().split("T")[0],
          },
          // BreadcrumbList for navigation
          {
            "@type": "BreadcrumbList",
            "@id": `${canonicalUrl}#breadcrumb`,
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
                name: "Developers",
                item: canonicalUrl,
              },
            ],
          },
        ],
      },
    },
  ];
};
