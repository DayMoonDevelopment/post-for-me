import type { Route } from "./+types/route";

export const meta: Route.MetaFunction = ({ data }) => {
  const tiers = data?.tiers || [];

  return [
    {
      title: "Pricing – Post for Me Social Media API | Starting at $5/month",
    },
    {
      name: "description",
      content:
        "Simple, predictable pricing for the Post for Me social media API. Plans start at $5/month for 500 posts. No surprise charges – scale as you grow with transparent pricing for TikTok, Instagram, Facebook, X, and more.",
    },
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Post for Me API Pricing – Starting at $5/month",
    },
    {
      property: "og:description",
      content:
        "Transparent pricing for social media automation API. Plans from $5-$1500/month with no surprise charges. Perfect for developers and businesses of all sizes.",
    },
    { property: "og:url", content: "https://www.postforme.dev/pricing" },
    { property: "og:image", content: "https://www.postforme.dev/og-image.png" },
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Post for Me API Pricing – Predictable Social Media Automation",
    },
    {
      name: "twitter:description",
      content:
        "Simple pricing for social media API. $5-$1500/month plans. No surprises, scale as you grow. TikTok, Instagram, Facebook, X automation.",
    },
    {
      name: "twitter:image",
      content: "https://www.postforme.dev/twitter-card.png",
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Post for Me Social Media API",
        description:
          "Unified API service for automating social media posting across multiple platforms including TikTok, Instagram, Facebook, X, YouTube, and more.",
        url: "https://www.postforme.dev/pricing",
        brand: {
          "@type": "Brand",
          name: "Post for Me",
        },
        manufacturer: {
          "@type": "Organization",
          name: "Day Moon Development",
          url: "https://www.daymoon.dev",
          logo: "https://www.daymoon.dev/logo.png",
          sameAs: [
            "https://www.linkedin.com/company/day-moon-development",
            "https://twitter.com/daymoondev",
          ],
        },
        category: "Software as a Service",
        offers: tiers.map((tier) => ({
          "@type": "Offer",
          name: `${tier.posts.toLocaleString()} Social Posts Plan`,
          description: `Monthly plan allowing up to ${tier.posts.toLocaleString()} successful social media posts with unlimited social accounts, API keys, and dashboard access.`,
          price: tier.price.toString(),
          priceCurrency: "USD",
          priceValidUntil: "2025-12-31",
          availability: "https://schema.org/InStock",
          eligibleQuantity: {
            "@type": "QuantitativeValue",
            value: tier.posts,
            unitCode: "C62",
            unitText: "posts per month",
          },
          billingIncrement: {
            "@type": "UnitPriceSpecification",
            billingDuration: "P1M",
            billingStart: "https://schema.org/OnDemand",
          },
          includesObject: [
            {
              "@type": "TypeAndQuantityNode",
              amountOfThisGood: tier.posts,
              typeOfGood: {
                "@type": "Service",
                name: "Social Media Post Processing",
              },
            },
            {
              "@type": "Service",
              name: "Unlimited Social Accounts",
            },
            {
              "@type": "Service",
              name: "Social Account Feeds",
            },
            {
              "@type": "Service",
              name: "Social Post Metrics",
            },
            {
              "@type": "Service",
              name: "Unlimited API Keys",
            },
            {
              "@type": "Service",
              name: "Social Media Developer Credentials",
            },
            {
              "@type": "Service",
              name: "Unlimited Dashboard Accounts",
            },
          ],
          url: "https://app.postforme.dev",
          seller: {
            "@type": "Organization",
            name: "Day Moon Development",
          },
        })),
      },
    },
  ];
};
