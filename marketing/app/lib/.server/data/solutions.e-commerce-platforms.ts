import type { SolutionData } from "./solutions";

export const ecommercePlatforms: SolutionData = {
  id: "e-commerce-platforms",
  nav: {
    title: "E-commerce Platforms",
    description: "Drive sales with automated product sharing and social commerce integration",
  },
  meta: {
    title: "Social Commerce API for E-commerce Platforms | Post for Me",
    description:
      "Add social sharing to your e-commerce platform. Automate product posts, user reviews, and promotions across 9 platforms. Drive traffic and sales with one API. From $10/mo for 1,000 posts.",
  },
  hero: {
    headline: "Turn product catalogs into social storefronts automatically.",
    description:
      "Embed social sharing for products, reviews, and promotions directly into your e-commerce platform. One API handles media-rich product posts across 9 platforms—driving organic traffic and sales while you focus on payments and inventory.",
  },
  valueProposition: {
    headline: "Social commerce without the integration headaches",
    subheadline:
      "We handle multi-platform sharing and media processing so you can enable powerful social selling features without distracting from core e-commerce development.",
    weHandle: [
      "Product image and video optimization for each platform",
      "Multi-platform posting infrastructure",
      "Platform-specific format requirements",
      "OAuth flows for customer social accounts",
      "Rate limiting for high-volume product catalogs",
      "Real-time posting status and error handling",
      "Analytics aggregation across platforms",
    ],
    youCan: [
      "Enable customers to share purchases and reviews automatically",
      "Schedule product launches and flash sales across platforms",
      "Track social-driven conversions and ROI",
      "Build user-generated content campaigns",
      "Automate promotional posts for seasonal sales",
      "Focus on checkout, payments, and inventory management",
    ],
  },
  coreFeatures: {
    headline: "Everything needed for social commerce",
    features: [
      {
        title: "Product sharing made seamless",
        description:
          "Let customers share products, purchases, and reviews with one click. Automatically format product images, descriptions, and links for each platform. Support user-generated content campaigns that drive organic traffic and build social proof at scale.",
      },
      {
        title: "Promotional automation at scale",
        description:
          "Schedule product launches, flash sales, and seasonal promotions across all platforms. Batch-post catalog updates or new arrivals. Media processing handles product photos and videos automatically—no manual resizing or formatting required.",
      },
      {
        title: "Track social commerce performance",
        description:
          "Measure which products generate the most social engagement and track social-driven conversions. Unified analytics show ROI across platforms. Integrate engagement data into your existing analytics dashboards to understand the full customer journey.",
      },
    ],
  },
  developerExperience: {
    headline: "Social selling without the development overhead.",
    subheadline: "One API for products, promotions, and performance tracking.",
    benefits: [
      {
        title: "Built for product-rich content",
        description:
          "Handle media-intensive posts with automatic image and video processing. Support multiple product images, carousel posts, and video demos. One API normalizes format requirements across platforms—from Instagram's visual focus to LinkedIn's business context.",
      },
      {
        title: "Integrate with your commerce stack",
        description:
          "Trigger social posts from product creation workflows, order confirmations, or review systems. REST API and SDKs (TypeScript, Python, Go, Ruby, Kotlin) fit into your existing architecture. Add social commerce features in days without rebuilding your platform.",
      },
      {
        title: "Scale with your merchant growth",
        description:
          "Start at $10/mo for 1,000 posts for testing. As merchants adopt social features, auto-upgrade based on usage. Pay only for posts—unlimited stores, unlimited products, unlimited API calls. Perfect for multi-tenant platforms with independent merchants.",
      },
    ],
  },
};
