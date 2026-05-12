import type { SolutionData } from "./solutions";

export const saasProducts: SolutionData = {
  id: "saas-products",
  nav: {
    title: "SaaS Products",
    description: "Add social media features to your SaaS without distracting from your core product",
  },
  meta: {
    title: "Social Media Integration API for SaaS Products | Post for Me",
    description:
      "Add social posting, scheduling, and analytics to your SaaS in days. One unified API handles 9 platforms so you can focus on your core product. From $10/mo for 1,000 posts.",
  },
  hero: {
    headline: "Enhance your SaaS with social features without the overhead.",
    description:
      "Add social media posting, scheduling, and analytics as complementary features to your product. One API integration handles all platforms—no maintenance burden, no distraction from your core offering.",
  },
  valueProposition: {
    headline: "Expand your feature set without expanding your roadmap",
    subheadline:
      "We handle the social integration complexity so you can offer powerful new capabilities while staying focused on what makes your SaaS unique.",
    weHandle: [
      "Multi-platform API integration and maintenance",
      "OAuth flows and account authentication",
      "Platform API changes and updates",
      "Media processing and format validation",
      "Rate limiting and error handling",
      "Analytics aggregation across platforms",
      "Real-time webhook notifications",
    ],
    youCan: [
      "Boost user retention with social engagement features",
      "Add revenue streams through premium social tiers",
      "Differentiate from competitors with native integrations",
      "Enable viral growth through automated sharing",
      "Integrate social data into your existing analytics",
      "Focus development time on your core product vision",
    ],
  },
  coreFeatures: {
    headline: "From feature idea to user value in days",
    features: [
      {
        title: "Complement your core offering seamlessly",
        description:
          "Add posting, scheduling, and analytics without feature bloat. Whether you're a CRM adding social outreach, an e-commerce platform enabling content marketing, or a creator tool distributing output—integrate once and support all platforms.",
      },
      {
        title: "Build it your way with a flexible API",
        description:
          "Design social features that match your product's UX and workflows. Embed posting in your dashboards, trigger shares from your automation rules, or surface analytics in your reporting. Full control, zero infrastructure burden.",
      },
      {
        title: "Scale pricing with feature adoption",
        description:
          "Start at $10/mo for 1,000 posts to validate the feature. As users adopt it, auto-upgrade based on usage. Pay only for posts—unlimited users, unlimited API calls, unlimited data. Predictable costs that grow with value delivered.",
      },
    ],
  },
  developerExperience: {
    headline: "Ship social features in a sprint, not a quarter.",
    subheadline: "One API for all platforms. Integrate once, support forever.",
    benefits: [
      {
        title: "Single integration for nine platforms",
        description:
          "Replace dozens of platform-specific SDKs with one REST API. Consistent request and response formats across Facebook, Instagram, X, LinkedIn, TikTok, YouTube, Pinterest, Bluesky, and Threads. Add new platforms to your roadmap with zero additional dev work.",
      },
      {
        title: "Drop-in SDKs for your tech stack",
        description:
          "TypeScript, Python, Go, Ruby, and Kotlin SDKs integrate directly into your existing codebase. Handle OAuth flows with pre-built components. Get social features live in days, not months—without diverting from your core development priorities.",
      },
      {
        title: "Analytics that fit your product",
        description:
          "Fetch engagement metrics through the same API. Combine social performance with your product analytics for unified reporting. Webhooks notify your app in real-time about post status, so you can surface updates in your UI automatically.",
      },
    ],
  },
};
