import type { FAQType } from "~/lib/global.types";
import type { Route } from "./+types/route";

function flattenFAQ(obj: { title: string; faq: FAQType[] }[]) {
  return obj.flatMap((section) => section.faq);
}

export const meta: Route.MetaFunction = ({ data }) => {
  return [
    {
      title:
        "Post for Me – Unified Social Media Posting API for TikTok, IG, FB, X & More",
    },
    {
      name: "description",
      content:
        "Unified API to schedule and post content on TikTok, Instagram, Facebook, X (Twitter), YouTube, Threads, Pinterest, and Bluesky. Built for developers – automate social media posting, upload images/videos, and integrate scheduling into your app.",
    },
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Post for Me – Unified Social Media Posting API",
    },
    {
      property: "og:description",
      content:
        "Unified API for developers to automate posting and scheduling content across TikTok, Instagram, Facebook, X, YouTube, Threads, Pinterest, and Bluesky.",
    },
    { property: "og:url", content: "https://www.postforme.dev" },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Post for Me – Unified Social Media Posting API",
    },
    {
      name: "twitter:description",
      content:
        "Automate social media posting on TikTok, Instagram, Facebook, X, LinkedIn, YouTube, Threads, Pinterest, Bluesky via unified API.",
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Post for Me",
        url: "https://www.postforme.dev",
        description:
          "A unified API service for developers to schedule and post images, videos, and content across TikTok, Facebook, Instagram, X (Twitter), LinkedIn, YouTube, Threads, Pinterest, and Bluesky.",
        applicationCategory: "SocialMediaApplication",
        operatingSystem: "Cloud",
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
          "Social media API, social media posting API, social media scheduling API, developer-friendly social media API, TikTok API, Instagram API, Facebook API, X API, LinkedIn API, YouTube API, Threads API, Pinterest API, Bluesky API, automate social posts, Ayrshare alternative, Hootsuite API alternative, Buffer API alternative",
        mainEntity: {
          "@type": "FAQPage",
          mainEntity: flattenFAQ(data?.faq || []).map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.a,
            },
          })),
        },
      },
    },
  ];
};
