import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const canonicalUrl =
    "https://www.postforme.dev/open-source-social-media-api";
  const ogImageUrl = "https://www.postforme.dev/og-image.png";
  const ogImageAlt =
    "Post for Me, the open source social media API for developers";
  const sharedKeywords =
    "open source social media API, open source social media scheduler, open source social posting API, social media API, transparent social media API, open source Buffer alternative";

  return [
    {
      title: "Open Source Social Media API | Post for Me",
    },
    {
      name: "description",
      content:
        "The open source social media API. Post to 9 platforms with one API. Every commit, PR, and roadmap decision is public on GitHub.",
    },
    { tagName: "link", rel: "canonical", href: canonicalUrl },

    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Post for Me" },
    {
      property: "og:title",
      content: "Open Source Social Media API | Post for Me",
    },
    {
      property: "og:description",
      content:
        "The best social media API, and it's open source. Post to 9 platforms with one API. Every commit, every PR is public on GitHub.",
    },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: ogImageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: ogImageAlt },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@postforme_dev" },
    {
      name: "twitter:title",
      content: "Open Source Social Media API | Post for Me",
    },
    {
      name: "twitter:description",
      content:
        "The open source social media API. Post to 9 platforms with one API. Every commit, every PR is public on GitHub.",
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },
    { name: "twitter:image:alt", content: ogImageAlt },

    // Structured Data (JSON-LD)
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SoftwareSourceCode",
            "@id": `${canonicalUrl}#source`,
            name: "Post for Me",
            url: canonicalUrl,
            codeRepository: "https://github.com/DayMoonDevelopment/post-for-me",
            programmingLanguage: ["TypeScript", "Python", "Go", "Ruby"],
            license: "https://www.gnu.org/licenses/agpl-3.0.html",
            description:
              "Open source social media API for posting, scheduling, OAuth, feeds, and analytics across TikTok, Instagram, Facebook, X, LinkedIn, YouTube, Threads, Pinterest, and Bluesky.",
            keywords: sharedKeywords,
            author: {
              "@type": "Organization",
              name: "Day Moon Development",
              url: "https://www.daymoon.dev",
            },
          },
          {
            "@type": "WebPage",
            "@id": canonicalUrl,
            url: canonicalUrl,
            name: "Open Source Social Media API",
            description:
              "The open source social media API. Post to 9 platforms with one integration. Every commit, every pull request, and every roadmap decision is public on GitHub.",
            isPartOf: {
              "@id": "https://www.postforme.dev/#website",
            },
            publisher: {
              "@id": "https://www.postforme.dev/#organization",
            },
            breadcrumb: {
              "@id": `${canonicalUrl}#breadcrumb`,
            },
            mainEntity: {
              "@id": `${canonicalUrl}#source`,
            },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: ogImageUrl,
              width: 1200,
              height: 630,
            },
            keywords: sharedKeywords,
          },
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
                name: "Open Source Social Media API",
                item: canonicalUrl,
              },
            ],
          },
        ],
      },
    },
  ];
};
