import type { IntegrationData } from "./integrations";

export const threads: IntegrationData = {
  id: "threads",
  name: "Threads",
  nav: {
    title: "Threads Integration",
    description:
      "Publish text, images, videos, and carousels with engagement analytics.",
  },
  meta: {
    title: "Threads API Integration — Post for Me",
    description:
      "Post text and media to Threads through the Post for Me unified API. Schedule content across all platforms from one endpoint.",
  },
  hero: {
    headline: "Reach Threads' growing audience from your own app",
    description:
      "Enable your users to publish text, images, videos, and carousels to Threads. Track engagement across all platforms through one API.",
  },
  capabilities: {
    posting: {
      title: "Post every format",
      description:
        "Publish text, images, videos, and carousels. Choose between Reels and timeline placements.",
    },
    feeds: {
      title: "Read published posts",
      description:
        "Pull Threads posts with content, media, and engagement data.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Access likes, replies, reposts, quotes, shares, and views to measure what resonates.",
    },
  },
  connectionTypes: [
    {
      name: "Threads Account",
      description:
        "Connect Threads accounts and start publishing. Post for Me handles Meta authentication and token refresh automatically.",
      authMethod: "OAuth 2.0",
      notes:
        "Uses Meta's Threads API endpoint. Token refresh handled automatically.",
    },
  ],
  postTypes: [
    {
      type: "Text",
      description: "Text-only Threads posts for quick updates and thoughts.",
    },
    {
      type: "Image",
      description: "Image posts with optional text captions.",
    },
    {
      type: "Video",
      description: "Video posts published to Threads.",
    },
    {
      type: "Carousel",
      description:
        "Multi-media carousel posts with mixed images and videos.",
    },
  ],
  platformConfigs: [
    {
      name: "Placement",
      field: "placement",
      description: "Target Reels or timeline placements for content distribution.",
    },
  ],
  useCases: [
    {
      title: "Cross-post to text-first platforms",
      description:
        "Publish the same content to Threads, X, Bluesky, and LinkedIn with format adjustments for each platform's audience.",
    },
    {
      title: "Build a Threads scheduler",
      description:
        "Let creators plan and schedule Threads content alongside their Instagram strategy for coordinated publishing.",
    },
    {
      title: "Track cross-platform engagement",
      description:
        "Pull Threads analytics into unified dashboards to compare performance with X, Bluesky, and other text-first platforms.",
    },
  ],
};
