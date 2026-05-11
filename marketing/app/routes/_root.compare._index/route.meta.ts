import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const title = "Compare Post for Me vs Social Media APIs | Developer Tool Comparisons";
  const description = "Compare Post for Me against Buffer, Hootsuite, Ayrshare, and other social media API solutions. Find the best API for your social media integration needs.";
  const canonicalUrl = "https://www.postforme.dev/compare";

  return [
    { title },
    {
      name: "description",
      content: description,
    },
    { rel: "canonical", href: canonicalUrl },
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: title,
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
      content: title,
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
      content: "Post for Me comparison, social media API comparison, Buffer alternative, Hootsuite alternative, Ayrshare alternative, social media posting API, developer API comparison, social media integration API",
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: canonicalUrl,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: 7,
          description: "Compare Post for Me with popular social media API solutions",
        },
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