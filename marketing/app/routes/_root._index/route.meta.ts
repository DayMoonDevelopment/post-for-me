import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = ({ data }) => {
  const canonicalUrl = "https://www.postforme.dev";

  return [
    // Standard title (30–60 characters)
    {
      title: "Post for Me – Unified Social Media Posting API",
      // 51 characters – perfect for homepage
    },

    // Meta description (120–160 characters) – homepage-focused with pricing hook
    {
      name: "description",
      content:
        "Unified developer API to post and schedule content across TikTok, Instagram, Facebook, X, LinkedIn, YouTube, Threads, Pinterest, and Bluesky. Plans start at just $10/month with unlimited accounts and analytics.",
      // 160 characters exactly
    },

    // Canonical URL
    { rel: "canonical", href: canonicalUrl },

    // Open Graph – optimized for social sharing of the homepage
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Post for Me – Unified Social Media Posting API",
    },
    {
      property: "og:description",
      content:
        "Automate social media posting across all major platforms with one simple API. Tiered plans start at $10/month – unlimited accounts, analytics, and system-managed credentials included.",
      // 158 characters
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
        "Post to TikTok, Instagram, Facebook, X, LinkedIn, YouTube & more via one API. Plans from $10/mo with unlimited accounts and built-in analytics.",
      // 136 characters
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },

    // Structured Data (JSON-LD) – homepage-appropriate for the overall service
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Post for Me",
        url: canonicalUrl,
        description:
          "Post for Me is a unified API that lets developers easily schedule and post images, videos, and text to TikTok, Instagram, Facebook, X (Twitter), LinkedIn, YouTube, Threads, Pinterest, and Bluesky from a single integration.",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        featureList: [
          "Single API for multiple social platforms",
          "Schedule posts in advance",
          "Upload images and videos",
          "Read social media feeds",
          "Post analytics and performance data",
          "Unlimited connected social accounts",
          "System-managed credentials (no individual app approvals needed)",
        ],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "10",
          highPrice: "1000",
          offerCount: "8",
          description: "Monthly subscription tiers based on post volume",
          url: "https://www.postforme.dev/pricing",
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
        // Homepage typically includes FAQ if present on the page
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
