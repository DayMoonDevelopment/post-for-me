import { MetadataComposer } from "~/lib/meta";

import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const composer = new MetadataComposer();

  composer.title = "Day Moon Development | Creators of Post for Me";
  composer.description =
    "Founded by Caleb Panza and Matt Rothenberger in 2023. Software development, SEO audits, mobile apps, and team augmentation. Creators of Post for Me API.";
  composer.canonical = "https://www.postforme.dev/day-moon-development";
  composer.keywords =
    "Day Moon Development, Daymoon Development, software development company, digital consultations, SEO audits, website development, mobile app development, staff augmentation, team augmentation, indie hacking tools, Caleb Panza, Matt Rothenberger, social media API integrations, Post for Me creators";
  composer.contentType = "article";
  composer.publishedTime = "2023-01-01";
  composer.modifiedTime = new Date().toISOString();

  // Main Organization schema
  composer.addSchema({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Day Moon Development",
    url: "https://www.daymoon.dev",
    alternateName: "Daymoon Development",
    logo: {
      "@type": "ImageObject",
      url: "https://www.postforme.dev/logo.png",
      width: 512,
      height: 512,
    },
    description:
      "A software development company dedicated to practical solutions for real-world challenges, specializing in digital consultations, SEO, web and mobile app development, and team augmentation.",
    foundingDate: "2023",
    founders: [
      {
        "@type": "Person",
        name: "Caleb Panza",
        sameAs: ["https://x.com/CalebPanza", "https://github.com/CalebPanza"],
      },
      {
        "@type": "Person",
        name: "Matt Rothenberger",
        sameAs: [
          "https://x.com/MisterMattRoth",
          "https://github.com/MisterMattRoth",
        ],
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "postforme@daymoon.dev",
      contactType: "Customer Support",
      availableLanguage: "English",
    },
    knowsAbout: [
      "Software Development",
      "Digital Consultations",
      "SEO Audits",
      "Website Development",
      "Mobile App Development",
      "Team Augmentation",
      "Staff Augmentation",
      "Product Development",
      "API Integration",
      "E-commerce Development",
      "Nonprofit Technology",
    ],
    sameAs: [
      "https://github.com/DayMoonDevelopment",
      "https://www.daymoon.dev",
    ],
    subOrganization: {
      "@type": "Organization",
      name: "Post For Me",
      url: "https://www.postforme.dev",
      description:
        "Unified social media API platform for 9 platforms including TikTok, Instagram, Facebook, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube.",
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
        name: "Day Moon Development",
        item: "https://www.postforme.dev/day-moon-development",
      },
    ],
  });

  return composer.build();
};
