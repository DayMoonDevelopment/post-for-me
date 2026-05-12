import type { SolutionData } from "./solutions";

export const games: SolutionData = {
  id: "games",
  nav: {
    title: "Game Development",
    description: "Turn player achievements into viral growth with automated social sharing",
  },
  meta: {
    title: "Social Sharing API for Game Developers | Post for Me",
    description:
      "Automate player achievement shares to fuel organic growth. One API posts epic wins across 9 platforms with player consent. Built for Unity, Unreal, and mobile games. From $10/mo for 1,000 posts.",
  },
  hero: {
    headline: "Turn epic player wins into viral growth automatically.",
    description:
      "Automate social sharing of player achievements, high scores, and in-game moments across 9 platforms. One API integration triggers authentic posts from real player successes—driving organic acquisition without manual shares.",
  },
  valueProposition: {
    headline: "Player-powered marketing on autopilot",
    subheadline:
      "We handle the social posting complexity so you can build viral game mechanics that turn player moments into free organic growth.",
    weHandle: [
      "Multi-platform integrations across 9 social networks",
      "Screenshot and video processing for achievement posts",
      "Player consent flows and OAuth authentication",
      "Platform API changes and compliance requirements",
      "Media formatting for each platform's specifications",
      "Rate limiting during viral spikes",
      "Real-time posting status and analytics",
    ],
    youCan: [
      "Trigger automated shares on achievements and milestones",
      "Build viral loops from authentic player moments",
      "Reduce user acquisition costs with organic growth",
      "Track share performance and viral coefficient",
      "Create rewards for social engagement",
      "Focus on core game mechanics instead of API maintenance",
    ],
  },
  coreFeatures: {
    headline: "From player achievement to viral post in one call",
    features: [
      {
        title: "Automated sharing with player consent",
        description:
          "Post player achievements, level completions, high scores, and epic moments automatically when they happen. Players opt-in once, then authentic wins share seamlessly to Facebook, X, Instagram, TikTok, and more—driving organic friend invites.",
      },
      {
        title: "Built for game engines and mobile",
        description:
          "Simple REST API integrates easily into Unity, Unreal, and custom engines. Trigger shares from game logic with a single call. SDKs for TypeScript, Python, Go, Ruby, and Kotlin. Works across iOS, Android, PC, and console.",
      },
      {
        title: "Scale with viral success",
        description:
          "Start at $10/mo for 1,000 posts for testing. As your game goes viral, auto-upgrade to handle thousands of player shares. Pay only for posts—unlimited players, unlimited projects. Perfect for indie studios and mobile hits.",
      },
    ],
  },
  developerExperience: {
    headline: "Stop building social SDKs. Start building viral games.",
    subheadline: "One API for all platforms. Drop-in integration. Built for viral mechanics.",
    benefits: [
      {
        title: "One integration replaces nine SDKs",
        description:
          "Skip Facebook SDK, Twitter API, Instagram Graph, and six more platform-specific integrations. One endpoint posts achievement screenshots, videos, and text across all platforms. Consistent format means code once, share everywhere.",
      },
      {
        title: "Trigger viral moments from game logic",
        description:
          "Hook into your achievement system, high score tracker, or custom events. When epic moments happen in-game, call the API to share them instantly. No complex SDKs or engine plugins—just a simple HTTP call from your game server or client.",
      },
      {
        title: "Analytics for viral optimization",
        description:
          "Track which achievements drive the most shares and friend invites. Measure viral coefficient per platform. Optimize reward mechanics based on real engagement data. Webhooks notify you when shares succeed or fail for retry logic.",
      },
    ],
  },
};
