import type { IntegrationData } from "./integrations";

export const bluesky: IntegrationData = {
  id: "bluesky",
  name: "Bluesky",
  nav: {
    title: "Bluesky Integration",
    description:
      "Post to the AT Protocol, read author feeds, and track engagement metrics.",
  },
  meta: {
    title: "Bluesky API Integration — Post for Me",
    description:
      "Post to Bluesky through the Post for Me unified API. One integration to publish across all major social platforms.",
  },
  hero: {
    headline: "Add Bluesky to your platform before everyone else does",
    description:
      "Add Bluesky posting to your platform with the same API you use for every other network. No need to learn the AT Protocol.",
  },
  capabilities: {
    posting: {
      title: "Publish to Bluesky",
      description:
        "Post text content to Bluesky. Treat it like any other social network in your app.",
    },
    feeds: {
      title: "Read author feeds",
      description:
        "Pull published posts with content, metadata, and engagement counts.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Access replies, likes, reposts, and quotes to measure content performance on Bluesky.",
    },
  },
  connectionTypes: [
    {
      name: "Bluesky Account",
      description:
        "Connect Bluesky accounts with an app password. No OAuth flow needed. Post for Me keeps sessions active and re-authenticates automatically.",
      authMethod: "App Password (AT Protocol)",
      notes:
        "No OAuth flow required. Sessions managed via AccessJWT/RefreshJWT with automatic re-authentication when needed.",
    },
  ],
  postTypes: [
    {
      type: "Text",
      description:
        "Text posts distributed across the AT Protocol network with federation support.",
    },
  ],
  platformConfigs: [],
  useCases: [
    {
      title: "Expand to decentralized social",
      description:
        "Add Bluesky as a distribution channel alongside traditional platforms without learning the AT Protocol.",
    },
    {
      title: "Cross-post text content",
      description:
        "Publish the same message to Bluesky, X, Threads, and LinkedIn with a single API call and platform-appropriate formatting.",
    },
    {
      title: "Monitor brand presence",
      description:
        "Track engagement metrics on Bluesky posts alongside other platforms in a unified analytics dashboard.",
    },
  ],
};
