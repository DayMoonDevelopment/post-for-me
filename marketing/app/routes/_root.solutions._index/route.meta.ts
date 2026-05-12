import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const canonicalUrl = "https://www.postforme.dev/solutions";

  return [
    {
      title: "Solutions for Every Developer | Post for Me",
    },
    {
      name: "description",
      content:
        "Discover how Post for Me powers social media features for schedulers, AI tools, games, SaaS products, e-commerce, influencer platforms, CRMs, DAMs, news publishers, and event management. One API for all platforms.",
    },
    { rel: "canonical", href: canonicalUrl },

    // Open Graph
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Solutions for Every Developer | Post for Me",
    },
    {
      property: "og:description",
      content:
        "From schedulers to AI tools, games to SaaS products—see how developers use Post for Me's unified API to build social features across 9 platforms without the infrastructure overhead.",
    },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Solutions for Every Developer | Post for Me",
    },
    {
      name: "twitter:description",
      content:
        "One API for social media features across schedulers, AI tools, games, SaaS, e-commerce, and more. From $10/mo for 1,000 posts.",
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },

    // Keywords
    {
      name: "keywords",
      content:
        "social media API, developer solutions, scheduler API, AI content API, game social sharing, SaaS social features, e-commerce social, influencer management API, CRM social integration, DAM publishing, news distribution API, event promotion API",
    },

    // Structured Data
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#collection`,
        name: "Post for Me Solutions",
        description:
          "Explore how developers across industries use Post for Me to add social media features without infrastructure overhead.",
        url: canonicalUrl,
        breadcrumb: {
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
              name: "Solutions",
              item: canonicalUrl,
            },
          ],
        },
      },
    },
  ];
};
