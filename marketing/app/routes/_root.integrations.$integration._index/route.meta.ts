import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = ({ matches, params }) => {
  const canonicalUrl = `https://www.postforme.dev/integrations/${params.integration}`;

  // Access integration data from parent layout route
  const parentMatch = matches.find(
    (m) => m?.id === "routes/_root.integrations.$integration",
  );
  const parentData = parentMatch?.data as
    | { integration?: { name: string; meta: { title: string; description: string } } }
    | undefined;
  const integration = parentData?.integration;

  if (!integration) {
    return [{ title: "Integration Not Found | Post for Me" }];
  }

  const ogImageAlt = `${integration.name} API Integration — Post for Me`;

  return [
    {
      title: integration.meta.title,
    },
    {
      name: "description",
      content: integration.meta.description,
    },
    { rel: "canonical", href: canonicalUrl },

    // Open Graph
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: integration.meta.title,
    },
    {
      property: "og:description",
      content: integration.meta.description,
    },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },
    {
      property: "og:image:alt",
      content: ogImageAlt,
    },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: integration.meta.title,
    },
    {
      name: "twitter:description",
      content: integration.meta.description,
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/og-image.png",
    },

    // Keywords
    {
      name: "keywords",
      content: [
        `${integration.name} API`,
        `${integration.name} integration`,
        `${integration.name} posting API`,
        `${integration.name} analytics API`,
        `${integration.name} developer tools`,
        "social media API",
        "unified social API",
        "REST API for social media",
        "social media integration",
        "posting API",
        "social media developer tools",
      ].join(", "),
    },

    // TechArticle structured data
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: `${integration.name} Integration`,
        description: integration.meta.description,
        url: canonicalUrl,
        image: "https://www.postforme.dev/og-image.png",
        proficiencyLevel: "Beginner",
        about: { "@id": "https://www.postforme.dev/#product" },
        publisher: { "@id": "https://www.postforme.dev/#organization" },
        author: {
          "@type": "Organization",
          name: "Day Moon Development",
          url: "https://www.daymoon.dev",
        },
        datePublished: "2024-01-01",
        dateModified: new Date().toISOString().split("T")[0],
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
            item: "https://www.postforme.dev/integrations",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: integration.name,
            item: canonicalUrl,
          },
        ],
      },
    },
  ];
};
