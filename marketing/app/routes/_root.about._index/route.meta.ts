import { MetadataComposer } from "~/lib/meta";

import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const composer = new MetadataComposer();

  composer.title =
    "About Post for Me | Unified Social Media API for Developers";
  composer.description =
    "How Post for Me was built: A unified API for TikTok, Instagram, Facebook, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube. Open source, transparent pricing from $10/month, built by developers for developers.";
  composer.canonical = "https://www.postforme.dev/about";
  composer.keywords =
    "Post for Me about, unified social media API, developer-first API, social media integration, TikTok API, Instagram API, Facebook API, X API, LinkedIn API, Pinterest API, Bluesky API, Threads API, YouTube API, 9 platforms, API-first platform, open source social API, Day Moon Development, OAuth integration";
  composer.contentType = "article";
  composer.publishedTime = "2024-01-01";
  composer.modifiedTime = new Date().toISOString();

  composer.setVideo({
    youtubeId: "3CAZhwUdtfw",
    title:
      "The Easiest Way to Build Social Media Integrations: Post for Me API",
    description:
      "One REST API call to post, schedule, and analyze across TikTok, Instagram, YouTube, Facebook, X, LinkedIn, Threads, Pinterest, and Bluesky.",
    uploadDate: "2024-01-01",
  });

  // Main AboutPage schema
  composer.addSchema({
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Post for Me",
    description:
      "The story of how Post for Me was built from developer frustrations with fragmented social media integrations.",
    url: "https://www.postforme.dev/about",
    mainEntity: {
      "@type": "Organization",
      name: "Post For Me",
      url: "https://www.postforme.dev",
      logo: {
        "@type": "ImageObject",
        url: "https://www.postforme.dev/logo.png",
        width: 512,
        height: 512,
      },
      description:
        "A unified API platform for social media integrations across 9 platforms—TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube.",
      foundingDate: "2024",
      founder: {
        "@type": "Organization",
        name: "Day Moon Development",
        url: "https://www.daymoon.dev",
      },
      parentOrganization: {
        "@type": "Organization",
        name: "Day Moon Development",
        url: "https://www.daymoon.dev",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "postforme@daymoon.dev",
        contactType: "Customer Support",
        availableLanguage: "English",
      },
      sameAs: [
        "https://github.com/DayMoonDevelopment/post-for-me",
        "https://x.com/postforme_dev",
        "https://discord.gg/Nv6xEZ2vP5",
      ],
      knowsAbout: [
        "Social Media API",
        "Developer Tools",
        "API Integration",
        "OAuth Authentication",
        "Content Distribution",
        "TikTok Integration",
        "Instagram Integration",
        "Facebook Integration",
        "X (Twitter) Integration",
        "LinkedIn Integration",
        "Pinterest Integration",
        "Bluesky Integration",
        "Threads Integration",
        "YouTube Integration",
      ],
      offers: {
        "@type": "Offer",
        name: "Post for Me API Plans",
        description: "Scalable pricing from $10/month for 1,000 posts",
        url: "https://www.postforme.dev/pricing",
        priceCurrency: "USD",
        price: "10.00",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "10.00",
          priceCurrency: "USD",
          referenceQuantity: {
            "@type": "QuantitativeValue",
            value: "1000",
            unitText: "posts per month",
          },
        },
      },
    },
  });

  // Breadcrumb schema
  composer.addSchema({
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
        name: "About",
        item: "https://www.postforme.dev/about",
      },
    ],
  });

  return composer.build();
};
