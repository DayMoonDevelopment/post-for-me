import type { SolutionData } from "./solutions";

export const eventManagement: SolutionData = {
  id: "event-management",
  nav: {
    title: "Event Management",
    description: "Drive attendance with automated event promotion and real-time social updates",
  },
  meta: {
    title: "Event Promotion API for Event Management Platforms | Post for Me",
    description:
      "Automate event promotion across 9 social platforms. Share invites, live updates, and post-event highlights. Track promotional ROI and viral growth. From $10/mo for 1,000 posts.",
  },
  hero: {
    headline: "Turn events into viral moments with automated social promotion.",
    description:
      "Power event management platforms with automated multi-platform promotion. One API handles event announcements, ticket launches, live updates, and post-event highlights—driving viral attendance growth while you focus on ticketing and attendee experience.",
  },
  valueProposition: {
    headline: "Viral event growth without the promotional overhead",
    subheadline:
      "We handle social promotion infrastructure so you can focus on core event features like ticketing, registration, and attendee engagement.",
    weHandle: [
      "Multi-platform event posting and scheduling",
      "Media processing for event images and videos",
      "Real-time updates during live events",
      "Platform-specific event format optimization",
      "OAuth flows for organizer social accounts",
      "Promotional analytics and ROI tracking",
      "Webhook notifications for engagement spikes",
    ],
    youCan: [
      "Automate event invites and ticket launch announcements",
      "Share live updates during events for FOMO marketing",
      "Enable attendee social sharing for viral growth",
      "Track which platforms drive the most ticket sales",
      "Build event discovery features with social reach",
      "Focus on ticketing, check-in, and attendee tools",
    ],
  },
  coreFeatures: {
    headline: "Everything for viral event promotion",
    features: [
      {
        title: "Automated promotional campaigns",
        description:
          "Schedule event teasers, early bird launches, and countdown posts across all platforms. Trigger automatic posts at key milestones—tickets on sale, speaker announcements, venue reveals. Support recurring events with templated promotion workflows.",
      },
      {
        title: "Live event amplification",
        description:
          "Share real-time updates, behind-the-scenes content, and highlights during events. Enable attendees to auto-share their participation with custom hashtags and event branding. Create FOMO for future events by showcasing the live experience across platforms.",
      },
      {
        title: "Track promotional ROI",
        description:
          "Measure which social platforms and post types drive the most ticket sales and registrations. Track viral coefficient as attendees share events. Attribute registrations to specific promotional posts for data-driven marketing optimization.",
      },
    ],
  },
  developerExperience: {
    headline: "Event promotion built into your platform.",
    subheadline: "One API for announcements, live updates, and viral attendee sharing.",
    benefits: [
      {
        title: "Integrate with event workflows",
        description:
          "Trigger posts when events are created, tickets go on sale, or registration milestones hit. Enable organizers to schedule promotional calendars directly from your platform. REST API and SDKs (TypeScript, Python, Go, Ruby, Kotlin) integrate with existing event management stacks.",
      },
      {
        title: "Scale with event virality",
        description:
          "Handle everything from small meetups to viral festivals with millions of attendees. Pay only for posts—unlimited events, unlimited organizers, unlimited API calls. Team-based billing from $10/mo supports multi-tenant platforms with independent event creators.",
      },
      {
        title: "Attendee sharing for organic growth",
        description:
          "Enable attendees to share registration confirmations, tickets, or live participation moments. Trigger social posts from check-in systems or event app interactions. Track viral sharing to measure organic reach and attendee-driven marketing impact.",
      },
    ],
  },
};
