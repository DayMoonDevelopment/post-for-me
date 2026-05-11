import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = () => {
  const canonicalUrl = "https://www.postforme.dev/contact";

  return [
    {
      title: "Contact Us - Post for Me | Get in Touch with Our Team",
    },
    {
      name: "description",
      content:
        "Get in touch with the Post for Me team. Contact us for support, partnership opportunities, or questions about our unified social media API platform.",
    },
    {
      name: "keywords",
      content:
        "contact Post for Me, support, customer service, get in touch, API support, developer support",
    },
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Contact Post for Me - Developer Support & Inquiries",
    },
    {
      property: "og:description",
      content:
        "Reach out to the Post for Me team for support, questions, or partnership opportunities.",
    },
    { property: "og:url", content: canonicalUrl },
    {
      property: "og:image",
      content: "https://www.postforme.dev/og-image.png",
    },
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Contact Post for Me - Support & Inquiries",
    },
    {
      name: "twitter:description",
      content:
        "Get in touch with our team for support or questions about the Post for Me API.",
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },
    { name: "robots", content: "index, follow" },
    { name: "author", content: "Day Moon Development" },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Contact Post for Me",
        description: "Get in touch with the Post for Me team",
        url: canonicalUrl,
        inLanguage: "en-US",
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
      },
    },
  ];
};
