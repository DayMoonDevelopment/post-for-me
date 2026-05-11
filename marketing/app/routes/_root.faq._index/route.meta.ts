import type { Route } from "./+types/route";
import type { FAQType } from "~/lib/global.types";

interface FAQSection {
  title: string;
  faq: FAQType[];
}

interface FAQPageData {
  faq: FAQSection[];
  allFAQs: FAQType[];
}

function generateFAQBreadcrumbs() {
  return {
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
        name: "FAQ",
        item: "https://www.postforme.dev/faq",
      },
    ],
  };
}

export const meta: Route.MetaFunction = ({ data }) => {
  const faqSections = (data as FAQPageData | undefined)?.faq || [];
  const allFAQs = (data as FAQPageData | undefined)?.allFAQs || [];
  const totalQuestions = allFAQs.length;
  const sectionTitles = faqSections.map((section) => section.title).join(", ");

  return [
    {
      title: "FAQ - Post for Me | Social Media API Questions & Answers",
    },
    {
      name: "description",
      content: `Get answers to frequently asked questions about Post for Me's unified social media API. Find help with pricing, integrations, security, media processing, and technical support for TikTok, Instagram, Facebook, X, YouTube, and more platforms. ${totalQuestions} questions answered across ${faqSections.length} categories.`,
    },
    {
      name: "keywords",
      content:
        "Post for Me FAQ, social media API questions, developer support, API documentation, social media integration help, platform API questions, pricing FAQ, technical support",
    },
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Frequently Asked Questions - Post for Me API",
    },
    {
      property: "og:description",
      content: `Comprehensive FAQ covering ${sectionTitles}. Get instant answers about our unified social media API for developers.`,
    },
    { property: "og:url", content: "https://www.postforme.dev/faq" },
    {
      property: "og:image",
      content: "https://www.postforme.dev/og-image.png",
    },
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Post for Me API FAQ - Developer Questions Answered",
    },
    {
      name: "twitter:description",
      content: `${totalQuestions} frequently asked questions about our unified social media API. Pricing, integrations, security & more.`,
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },
    { name: "robots", content: "index, follow" },
    { name: "author", content: "Day Moon Development" },
    { property: "article:section", content: "Support" },
    {
      property: "article:tag",
      content: "FAQ, API Documentation, Developer Support",
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        name: "Post for Me - Frequently Asked Questions",
        description:
          "Comprehensive FAQ for Post for Me's unified social media API platform",
        url: "https://www.postforme.dev/faq",
        inLanguage: "en-US",
        dateModified: new Date().toISOString(),
        publisher: {
          "@type": "Organization",
          name: "Day Moon Development",
          url: "https://www.daymoon.dev",
          logo: {
            "@type": "ImageObject",
            url: "https://www.daymoon.dev/logo.png",
            width: 400,
            height: 400,
          },
          sameAs: [
            "https://www.linkedin.com/company/day-moon-development",
            "https://twitter.com/daymoondev",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            email: "postforme@daymoon.dev",
            contactType: "Customer Service",
            availableLanguage: "English",
          },
        },
        about: {
          "@type": "SoftwareApplication",
          name: "Post for Me",
          description: "Unified social media API for developers",
          applicationCategory: "SocialMediaApplication",
          operatingSystem: "Cloud",
          url: "https://www.postforme.dev",
        },
        breadcrumb: generateFAQBreadcrumbs(),
        mainEntity: allFAQs.map((faq, index) => ({
          "@type": "Question",
          "@id": `https://www.postforme.dev/faq#question-${index + 1}`,
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: [".faq-question", ".faq-answer"],
        },
      },
    },
  ];
};
