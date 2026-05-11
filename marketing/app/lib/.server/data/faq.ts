import { FAQCategory, type FAQItem } from "~/lib/global.types";

export const faqItems: FAQItem[] = [
  // General Questions
  {
    id: "what-is-post-for-me",
    category: FAQCategory.General,
    question: "What is Post for Me?",
    answer:
      "Post for Me is a unified API platform that simplifies social media integrations for developers, enabling posting, scheduling, media processing, OAuth, feed reading, and post metrics across 9 platforms: TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube.",
    routes: [],
  },
  {
    id: "who-is-post-for-me-for",
    category: FAQCategory.General,
    question: "Who is Post for Me designed for?",
    answer:
      "It's built for teams creating marketing workflows, AI content generation tools, mobile games, social media scheduling apps, and B2B SaaS products needing seamless social media integrations.",
    routes: [],
  },
  {
    id: "compare-to-other-apis",
    category: FAQCategory.General,
    question: "How does Post for Me compare to other social media APIs?",
    answer:
      "Unlike competitors, we offer a single API for 9 platforms, no arbitrary rate limits (only platform-enforced ones), no account caps, and pricing based on your actual posting volume. Plus you can bring your own credentials for a completely white labelled experience",
    routes: [],
  },
  {
    id: "why-choose-post-for-me",
    category: FAQCategory.General,
    question: "Why should I choose Post for Me over direct platform APIs?",
    answer:
      "We handle OAuth, token refresh, media processing, and platform-specific quirks, reducing integration time by weeks while giving you full access to each platform's features.",
    routes: ["home"],
  },
  {
    id: "how-to-get-started",
    category: FAQCategory.General,
    question: "How do I get started?",
    answer:
      "Getting started is simple. Signup for an account, plug in your App credentials OR use ours, create an API key, and then connect an account and start posting!",
    routes: ["home"],
  },

  // Pricing and Plans
  {
    id: "pricing-plans",
    category: FAQCategory.Pricing,
    question: "What are the pricing plans for Post for Me?",
    answer:
      "We offer tiered pricing to give you a predictable, fixed cost that scales with your usage, starting at $10/month for 1,000 total posts.",
    routes: ["home"],
  },
  {
    id: "exceeding-post-limit",
    category: FAQCategory.Pricing,
    question: "Will I get shut down if I go over my plan's post limit?",
    answer:
      "No, we won't shut down your service or auto-upgrade your plan. If you consistently exceed your post limit, we'll contact you at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) to discuss increasing your plan limits.",
    routes: [
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },
  {
    id: "nonprofit-discounts",
    category: FAQCategory.Pricing,
    question: "Do you offer discounts for non-profits?",
    answer:
      "Yes, non-profits can contact us at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) for potential discounts.",
    routes: [],
  },
  {
    id: "enterprise-pricing",
    category: FAQCategory.Pricing,
    question: "What is enterprise pricing?",
    answer:
      "For volumes above 200,000 posts/month, contact us at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) for custom pricing and dedicated support.",
    routes: [],
  },
  {
    id: "hidden-fees",
    category: FAQCategory.Pricing,
    question: "Are there any hidden fees?",
    answer:
      "No, our pricing is transparent and based solely on your posting volume. No additional fees apply.",
    routes: [],
  },
  {
    id: "upgrade-plan",
    category: FAQCategory.Pricing,
    question: "How do I upgrade my plan?",
    answer:
      "Log into the admin dashboard at [app.postforme.dev](https://www.postforme.dev) and select a higher tier under billing settings.",
    routes: [],
  },
  {
    id: "payment-methods",
    category: FAQCategory.Pricing,
    question: "What payment methods are accepted?",
    answer: "We accept major credit cards and secure payments via Stripe.",
    routes: [],
  },

  // Security and Data Management
  {
    id: "data-security",
    category: FAQCategory.Security,
    question: "How does Post for Me handle user data security?",
    answer:
      "We store OAuth access tokens securely in our database, leveraging the security of providers like Supabase, Render, Trigger, and Vercel.",
    routes: [],
  },
  {
    id: "disconnect-accounts",
    category: FAQCategory.Security,
    question: "Can users disconnect their social media accounts?",
    answer:
      "Yes, users can disconnect their accounts at any time via your app or our API, revoking access instantly.",
    routes: [],
  },
  {
    id: "delete-data",
    category: FAQCategory.Security,
    question: "How do I delete my data?",
    answer:
      "Use our API to delete user data at any time. We ensure secure deletion from our database upon request.",
    routes: [],
  },
  {
    id: "compliance",
    category: FAQCategory.Security,
    question: "Is Post for Me compliant with data regulations?",
    answer:
      "Our providers ensure robust security, but specific compliance (e.g., GDPR, CCPA) depends on your implementation. Contact us at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) for guidance.",
    routes: [],
  },
  {
    id: "oauth-token-management",
    category: FAQCategory.Security,
    question: "How are OAuth tokens managed?",
    answer:
      "We handle OAuth token storage, refresh, and revocation securely, so you don't need to manage platform-specific token lifecycles.",
    routes: [
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },

  // Integrations and APIs
  {
    id: "supported-platforms",
    category: FAQCategory.Integration,
    question: "Which platforms does Post for Me support?",
    answer:
      "TikTok, TikTok (Business), Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube.",
    routes: [
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },
  {
    id: "own-credentials",
    category: FAQCategory.Integration,
    question: "Can I use my own social media developer credentials?",
    answer:
      "Yes, you can bring your own credentials or use ours to connect user accounts to your app.",
    routes: [
      "home",
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },
  {
    id: "available-sdks",
    category: FAQCategory.Integration,
    question: "What SDKs does Post for Me offer?",
    answer:
      "We provide TypeScript, Python, Go, Ruby, and Kotlin SDKs. Find setup guides on our [GitHub repos](https://github.com/DayMoonDevelopment).",
    routes: [
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },
  {
    id: "webhook-support",
    category: FAQCategory.Integration,
    question: "Does Post for Me support webhooks?",
    answer:
      "Yes, we offer webhooks for real-time post status updates and notifications.",
    routes: [
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },
  {
    id: "how-to-integrate",
    category: FAQCategory.Integration,
    question: "How do I integrate Post for Me into my app?",
    answer:
      "Use our REST API or SDKs with setup instructions at [api.postforme.dev](https://api.postforme.dev) or our [GitHub repos](https://github.com/DayMoonDevelopment).",
    routes: [],
  },
  {
    id: "platform-specific-features",
    category: FAQCategory.Integration,
    question: "Can I access platform-specific features?",
    answer:
      "Yes, our unified API exposes unique features of each platform while simplifying integration.",
    routes: [],
  },

  // Media Processing
  {
    id: "media-uploads",
    category: FAQCategory.Media,
    question: "How does Post for Me handle media uploads?",
    answer:
      "We tailor your media to each platform's requirements (e.g., size, format) and process it for posting.",
    routes: [
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },
  {
    id: "media-storage",
    category: FAQCategory.Media,
    question: "Can I store media with Post for Me?",
    answer:
      "Yes, upload media to our storage, where it's kept only until posting is complete, or use your own public or signed URLs.",
    routes: [],
  },
  {
    id: "media-size-limits",
    category: FAQCategory.Media,
    question: "What are the media size limits?",
    answer:
      "Limits vary by platform (e.g., TikTok's video size caps). We automatically adjust media to comply.",
    routes: [],
  },
  {
    id: "media-preprocessing",
    category: FAQCategory.Media,
    question: "Do I need to pre-process media?",
    answer:
      "No, we handle all media processing to meet each platform's specifications.",
    routes: [],
  },
  {
    id: "media-after-posting",
    category: FAQCategory.Media,
    question: "What happens to media after posting?",
    answer:
      "Media uploaded to our storage is deleted after posting unless you specify otherwise.",
    routes: [],
  },

  // Account and Setup
  {
    id: "signup",
    category: FAQCategory.Account,
    question: "How do I sign up for Post for Me?",
    answer:
      "Create an account at [postforme.dev](https://www.postforme.dev) and access API keys via the admin dashboard.",
    routes: [
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },
  {
    id: "team-members",
    category: FAQCategory.Account,
    question: "Can I add multiple team members to the admin dashboard?",
    answer:
      "Yes, our dashboard has no user cap, so invite your entire team to manage integrations.",
    routes: [],
  },
  {
    id: "change-email",
    category: FAQCategory.Account,
    question: "How do I change my account email?",
    answer:
      "Update it in the admin dashboard settings at [postforme.dev](https://www.postforme.dev).",
    routes: [],
  },
  {
    id: "reset-api-keys",
    category: FAQCategory.Account,
    question: "How do I reset my API keys?",
    answer:
      "Generate new keys in the admin dashboard; delete any keys you no longer need.",
    routes: [],
  },
  {
    id: "cancel-account",
    category: FAQCategory.Account,
    question: "Can I cancel my account?",
    answer:
      "Yes, delete your account via the dashboard or API, and export data first as deletion is irreversible.",
    routes: [],
  },

  // Support and Resources
  {
    id: "support-options",
    category: FAQCategory.Support,
    question: "What support options does Post for Me offer?",
    answer:
      "We provide live chat on [postforme.dev](https://www.postforme.dev) and email support at [postforme@daymoon.dev](mailto:postforme@daymoon.dev).",
    routes: [
      "solutions.social-media-scheduler",
      "solutions.ai-content-generation",
      "solutions.multi-account-management",
    ],
  },
  {
    id: "documentation",
    category: FAQCategory.Support,
    question: "Where can I find documentation?",
    answer:
      "Check our API docs at [api.postforme.dev](https://api.postforme.dev) and setup guides on our [GitHub repos](https://github.com/DayMoonDevelopment).",
    routes: [],
  },
  {
    id: "developer-resources",
    category: FAQCategory.Support,
    question: "Are there additional resources for developers?",
    answer:
      "Yes, explore platform-specific guides at [postforme.dev/resources](https://www.postforme.dev/resources) for TikTok, Instagram, and more.",
    routes: [],
  },
  {
    id: "onboarding-assistance",
    category: FAQCategory.Support,
    question: "Do you offer onboarding assistance?",
    answer:
      "Follow our [GitHub setup guides](https://github.com/DayMoonDevelopment) or contact us at [postforme@daymoon.dev](mailto:postforme@daymoon.dev) for personalized support.",
    routes: [],
  },
  {
    id: "support-response-time",
    category: FAQCategory.Support,
    question: "How quickly do you respond to support queries?",
    answer:
      "We aim to respond within 24 hours, with priority for enterprise users.",
    routes: [],
  },

  // Technical Questions
  {
    id: "technical-requirements",
    category: FAQCategory.Technical,
    question: "What are the technical requirements for Post for Me?",
    answer:
      "No specific requirements—just use our REST API, SDKs, or MCP server. The admin dashboard works on any modern browser.",
    routes: [],
  },
  {
    id: "sdk-list",
    category: FAQCategory.Technical,
    question: "Which SDKs are available?",
    answer:
      "TypeScript, Python, Go, Ruby, and Kotlin. See [GitHub](https://github.com/DayMoonDevelopment) for setup.",
    routes: [],
  },
  {
    id: "mcp-server-support",
    category: FAQCategory.Technical,
    question: "Does Post for Me support MCP servers?",
    answer:
      "Yes, we offer an MCP server for advanced integrations. Check [api.postforme.dev](https://api.postforme.dev).",
    routes: [],
  },
  {
    id: "test-before-purchase",
    category: FAQCategory.Technical,
    question: "Can I test the API before purchasing?",
    answer:
      "You'll need an active plan to use the API, but our $5/month tier is low-cost to start.",
    routes: [],
  },
  {
    id: "oauth-flows",
    category: FAQCategory.Technical,
    question: "Do I need to handle OAuth flows?",
    answer:
      "Nope! We handle all the OAuth flows for you. You just need to give your users a button to connect their accounts.",
    routes: ["home"],
  },

  // Troubleshooting
  {
    id: "cant-connect-account",
    category: FAQCategory.Troubleshooting,
    question: "Why can't I connect a social media account?",
    answer:
      "Check OAuth setup in your app or ensure credentials are valid. See platform guides at [postforme.dev/resources](https://www.postforme.dev/resources).",
    routes: [],
  },
  {
    id: "posts-fail-to-publish",
    category: FAQCategory.Troubleshooting,
    question: "What if my posts fail to publish?",
    answer:
      "Check platform-specific errors via webhooks, querying post results, or contact support with logs at [postforme@daymoon.dev](mailto:postforme@daymoon.dev).",
    routes: [],
  },
  {
    id: "media-upload-failing",
    category: FAQCategory.Troubleshooting,
    question: "Why is my media upload failing?",
    answer:
      "Ensure media meets platform requirements or use our storage for automatic processing.",
    routes: [],
  },
  {
    id: "debug-api-issues",
    category: FAQCategory.Troubleshooting,
    question: "How do I debug API issues?",
    answer:
      "Review error codes in our [API docs](https://api.postforme.dev) or use SDK logs for details.",
    routes: [],
  },
];

// Helper functions

/**
 * Get all FAQs organized by category for the /faq page
 * Only includes FAQs that have a category assigned
 */
export function getFAQsByCategory() {
  const categories = Object.values(FAQCategory);
  return categories.map((category) => ({
    category,
    items: faqItems.filter((item) => item.category === category),
  }));
}

/**
 * Get all FAQs including those without categories (for metadata)
 */
export function getAllFAQsWithoutCategory() {
  return faqItems.filter((item) => !item.category);
}

/**
 * Get all FAQs (for backward compatibility and metadata)
 */
export function getAllFAQs() {
  return faqItems;
}

/**
 * Get FAQs for a specific route
 */
export function getFAQsForRoute(routeId: string) {
  return faqItems.filter((item) => item.routes.includes(routeId));
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: FAQCategory): string {
  const displayNames: Record<FAQCategory, string> = {
    [FAQCategory.General]: "General Questions",
    [FAQCategory.Pricing]: "Pricing and Plans",
    [FAQCategory.Security]: "Security and Data Management",
    [FAQCategory.Integration]: "Integrations and APIs",
    [FAQCategory.Media]: "Media Processing",
    [FAQCategory.Account]: "Account and Setup",
    [FAQCategory.Support]: "Support and Resources",
    [FAQCategory.Technical]: "Technical Questions",
    [FAQCategory.Troubleshooting]: "Troubleshooting",
  };
  return displayNames[category];
}
