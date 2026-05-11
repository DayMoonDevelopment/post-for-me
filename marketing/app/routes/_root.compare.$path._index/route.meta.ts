import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = ({ data, params }) => {
  const canonicalUrl = `https://www.postforme.dev/compare/${params.path}`;
  const comparison = data?.comparison;

  if (!comparison) {
    return [{ title: "Comparison Not Found | Post for Me" }];
  }

  const title = `Post for Me vs ${comparison.competitor.name}: A Developer's Guide | Post for Me`;
  const description = `Discover why developers are choosing Post for Me over ${comparison.competitor.name} to build integrations with social media platforms for posting and analytics`;
  const headline = `Post for Me vs. ${comparison.competitor.name}: A Developer's Guide`;

  return [
    {
      title,
    },
    {
      name: "description",
      content: description,
    },
    { rel: "canonical", href: canonicalUrl },
    { property: "og:type", content: "article" },
    {
      property: "og:title",
      content: headline,
    },
    {
      property: "og:description",
      content: description,
    },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: headline,
    },
    {
      name: "twitter:description",
      content: description,
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },
    {
      name: "keywords",
      content: `Post for Me vs ${comparison.competitor.name}, ${comparison.competitor.name} alternative, social media API, developer API comparison, social media posting API, Post for Me vs ${comparison.competitor.name}, social media API comparison, ${comparison.competitor.productType}, developer tools`,
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Article",
        headline,
        description,
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
    },
  ];
};
