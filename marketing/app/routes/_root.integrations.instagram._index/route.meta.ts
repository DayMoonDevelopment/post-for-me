import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = ({ data }) => {
  const canonicalUrl = "https://www.postforme.dev/integrations/instagram";
  const integration = data?.integration;

  if (!integration) {
    return [{ title: "Integration Not Found | Post for Me" }];
  }

  return [
    { title: integration.meta.title },
    { name: "description", content: integration.meta.description },
    { rel: "canonical", href: canonicalUrl },
    { property: "og:type", content: "website" },
    { property: "og:title", content: integration.meta.title },
    { property: "og:description", content: integration.meta.description },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },
    { property: "og:image:alt", content: "Instagram API Integration — Post for Me" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: integration.meta.title },
    { name: "twitter:description", content: integration.meta.description },
    { name: "twitter:image", content: "https://www.postforme.dev/og-image.png" },
    {
      name: "keywords",
      content: "Instagram API, Instagram integration, Instagram posting API, Instagram Reels API, Instagram analytics API, social media API, unified social API",
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: "Instagram Integration",
        description: integration.meta.description,
        url: canonicalUrl,
        image: "https://www.postforme.dev/og-image.png",
        proficiencyLevel: "Beginner",
        about: { "@id": "https://www.postforme.dev/#product" },
        publisher: { "@id": "https://www.postforme.dev/#organization" },
        author: { "@type": "Organization", name: "Day Moon Development", url: "https://www.daymoon.dev" },
        datePublished: "2024-01-01",
        dateModified: new Date().toISOString().split("T")[0],
      },
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.postforme.dev" },
          { "@type": "ListItem", position: 2, name: "Integrations", item: "https://www.postforme.dev/integrations" },
          { "@type": "ListItem", position: 3, name: "Instagram", item: canonicalUrl },
        ],
      },
    },
  ];
};
