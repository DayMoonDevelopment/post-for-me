import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = ({ data }) => {
  const canonicalUrl = "https://www.postforme.dev";

  return [
    // Standard title (30–60 characters)
    {
      title: "Post for Me – Unified Social Media Posting API",
      // 51 characters
    },

    // Meta description (120–160 characters)
    {
      name: "description",
      content:
        "Unified API for developers to post and schedule across TikTok, Instagram, Facebook, X, LinkedIn, YouTube, Threads, Pinterest, and Bluesky. Tiered pricing from $10/mo with unlimited accounts, analytics, and more.",
      // 159 characters
    },

    // Canonical URL
    { rel: "canonical", href: canonicalUrl },

    // Open Graph
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Post for Me – Unified Social Media Posting API",
    },
    {
      property: "og:description",
      content:
        "Automate posting and scheduling across major social platforms with a single developer-friendly API. Plans start at $10/month.",
      // 118 characters – engaging for shares
    },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Post for Me – Unified Social Media Posting API",
    },
    {
      name: "twitter:description",
      content:
        "Unified API to post on TikTok, Instagram, Facebook, X, LinkedIn, YouTube & more. Tiered plans from $10/mo including analytics and unlimited accounts.",
      // 140 characters
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },

    // Structured Data (JSON-LD)
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebApplication", // Better for SaaS APIs (browser-based dashboard/access)
        name: "Post for Me",
        url: canonicalUrl,
        description:
          "Unified API service for developers to schedule and post images, videos, and content across major social platforms: TikTok, Instagram, Facebook, X (Twitter), LinkedIn, YouTube, Threads, Pinterest, and Bluesky.",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires modern web browser with JavaScript",
        featureList: [
          "Unified posting API for multiple social platforms",
          "Schedule posts",
          "Upload images and videos",
          "Read social media feeds",
          "Post analytics",
          "Unlimited connected social accounts",
          "System-managed credentials (no need for your own app approvals)",
        ],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "10",
          highPrice: "1000",
          offerCount: "8",
          offers: [
            {
              "@type": "Offer",
              price: "10",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                name: "Up to 1,000 posts/month",
              },
            },
            {
              "@type": "Offer",
              price: "25",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                name: "Up to 2,500 posts/month",
              },
            },
            {
              "@type": "Offer",
              price: "50",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                name: "Up to 5,000 posts/month",
              },
            },
            {
              "@type": "Offer",
              price: "75",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                name: "Up to 10,000 posts/month",
              },
            },
            {
              "@type": "Offer",
              price: "150",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                name: "Up to 20,000 posts/month",
              },
            },
            {
              "@type": "Offer",
              price: "300",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                name: "Up to 40,000 posts/month",
              },
            },
            {
              "@type": "Offer",
              price: "500",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                name: "Up to 100,000 posts/month",
              },
            },
            {
              "@type": "Offer",
              price: "1000",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                name: "Up to 200,000 posts/month",
              },
            },
          ],
        },
        provider: {
          "@type": "Organization",
          name: "Day Moon Development",
          url: "https://www.daymoon.dev",
          logo: "https://www.daymoon.dev/logo.png",
          sameAs: [
            "https://www.linkedin.com/company/day-moon-development",
            "https://twitter.com/daymoondev",
          ],
        },
        keywords:
          "social media API, social posting API, social scheduling API, TikTok API, Instagram API, Facebook API, X API, LinkedIn API, YouTube API, Threads API, Pinterest API, Bluesky API, automate social media",
        mainEntity: data?.faq
          ? {
              "@type": "FAQPage",
              mainEntity: data.faq.map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: a,
                },
              })),
            }
          : undefined,
      },
    },
  ];
};
