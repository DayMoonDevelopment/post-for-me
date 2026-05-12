import type { SolutionData } from "./solutions";

export const socialMediaScheduler: SolutionData = {
  id: "social-media-scheduler",
  nav: {
    title: "Social Media Scheduler",
    description:
      "Build custom scheduler apps with unified API across 9 platforms",
  },
  meta: {
    title: "Social Media Scheduling API for Developers | Post for Me",
    description:
      "Ship social media scheduling in hours, not weeks. Build custom schedulers with a single API handling posting, media processing, OAuth across 9 platforms. From $10/mo for 1,000 posts.",
  },
  hero: {
    headline: "Build the next viral social media scheduler in days, not weeks.",
    description:
      "Build custom scheduler apps with a single API that handles posting, scheduling, media processing, and OAuth across 9 platforms. Focus on unique UX features while we manage the infrastructure.",
  },
  valueProposition: {
    headline: "Focus on what matters",
    subheadline:
      "We handle the infrastructure complexity so you can build features that help users manage their social media.",
    weHandle: [
      "Connecting accounts",
      "Media processing",
      "Instant and scheduled posting",
      "Platform API changes",
      "Real-time updates",
      "Analytics and engagement data",
      "Cross-platform posting",
    ],
    youCan: [
      "Help users manage their content strategy",
      "Build smart scheduling features like best time to post and content calendars",
      "Ship reactive experiences and notifications",
      "Deliver insights and reporting",
      "Help users craft platform-specific content variations",
      "Build team collaboration and approval workflows",
    ],
  },
  coreFeatures: {
    headline: "One tool for everything you need",
    features: [
      {
        title: "Everything you need in one API",
        description:
          "Post instantly or schedule for later, connect accounts via OAuth, fetch feeds to display content, track analytics for insights, and process media automatically. All social media platforms through a single API.",
      },
      {
        title: "Build once, post everywhere",
        description:
          "Write your integration code once and it works across TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube. No platform-specific logic required.",
      },
      {
        title: "Start small, scale without limits",
        description:
          "Start at $10/mo for 1,000 posts, then grow to millions as your product scales. The API scales with you—unlimited accounts, unlimited team members, unlimited projects. Pay only for what you use.",
      },
    ],
  },
  developerExperience: {
    headline: "Built for developers by developers.",
    subheadline:
      "Unlimited projects, accounts, and team members. Endless scale.",
    benefits: [
      {
        title: "Single API for all 9 platforms",
        description:
          "One REST API endpoint replaces dozens of platform-specific integrations. Consistent request and response formats across TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube.",
      },
      {
        title: "SDKs for rapid integration",
        description:
          "TypeScript, Python, Go, Ruby, and Kotlin SDKs with automatic authentication handling and type safety. Get your first post live in minutes, not days.",
      },
      {
        title: "Webhooks for real-time updates",
        description:
          "Build reactive experiences with webhooks for post status, account connections, and errors. No need for polling. You'll get notified instantly when events occur.",
      },
    ],
  },
};
