import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = ({ data, params }) => {
  const canonicalUrl = `https://www.postforme.dev/solutions/${params.id}`;
  const solution = data?.solution;

  if (!solution) {
    return [{ title: "Solution Not Found | Post for Me" }];
  }

  // Generate feature list from solution data
  const featureList = [
    ...solution.valueProposition.weHandle,
    ...solution.coreFeatures.features.map((f) => f.title),
    ...solution.developerExperience.benefits.map((b) => b.title),
  ];

  // Generate keywords from solution content
  const keywords = [
    `${solution.nav.title.toLowerCase()} API`,
    "social media API",
    "unified social API",
    "REST API for social media",
    "posting API",
    "scheduling API",
    "TikTok API",
    "Instagram API",
    "Facebook API",
    "X API",
    "LinkedIn API",
    "YouTube API",
    "Pinterest API",
    "Threads API",
    "Bluesky API",
    "media processing API",
    "webhook API",
    "analytics API",
    "developer API",
    "social media integration",
  ].join(", ");

  return [
    // Standard title (50–60 characters optimal for SERPs)
    {
      title: solution.meta.title,
    },

    // Meta description (150–160 characters) – comprehensive feature overview
    {
      name: "description",
      content: solution.meta.description,
    },

    // Canonical URL
    { rel: "canonical", href: canonicalUrl },

    // Open Graph – optimized for developer sharing
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: solution.hero.headline,
    },
    {
      property: "og:description",
      content: solution.hero.description,
    },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: solution.hero.headline,
    },
    {
      name: "twitter:description",
      content: solution.meta.description,
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },

    // Additional SEO meta tags
    {
      name: "keywords",
      content: keywords,
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
            name: `Post for Me - ${solution.nav.title}`,
            url: canonicalUrl,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web, iOS, Android, Windows, macOS, Linux",
            description: solution.hero.description,
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
            featureList,
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
            headline: solution.hero.headline,
            description: `${solution.hero.description} ${solution.valueProposition.subheadline}`,
            keywords,
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
                name: "Solutions",
                item: "https://www.postforme.dev/solutions",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: solution.nav.title,
                item: canonicalUrl,
              },
            ],
          },
        ],
      },
    },
  ];
};
