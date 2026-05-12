import type { IntegrationData } from "./integrations";

export const x: IntegrationData = {
  id: "x",
  name: "X",
  nav: {
    title: "X (Twitter) Integration",
    description:
      "Publish posts, polls, and threads with media support and full analytics access.",
  },
  meta: {
    title: "X (Twitter) API Integration — Post for Me",
    description:
      "Post tweets, threads, and media to X through the Post for Me unified API. Schedule and track engagement across all platforms.",
  },
  hero: {
    headline: "Skip the X API complexity. Ship posts in minutes.",
    description:
      "Enable your users to publish posts, create polls, and track engagement on X. Build publishing features into your app with a single API.",
  },
  capabilities: {
    posting: {
      title: "Publish posts and polls",
      description:
        "Publish text, images, videos, and polls. Quote posts, reply to threads, and post to X Communities.",
    },
    feeds: {
      title: "Read timelines",
      description:
        "Pull user timelines with post content, media, and engagement metrics for content display.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Access reposts, replies, likes, quotes, impressions, and click data to measure performance.",
    },
  },
  connectionTypes: [
    {
      name: "X (Twitter) Account",
      description:
        "Connect X accounts and post immediately. Tokens never expire, so your users stay connected without re-authenticating.",
      authMethod: "OAuth 1.0a",
      notes:
        "Non-expiring tokens eliminate refresh complexity.",
    },
  ],
  postTypes: [
    {
      type: "Text",
      description: "Standard text posts up to 280 characters.",
    },
    {
      type: "Image",
      description:
        "Posts with one or more attached images in various formats.",
    },
    {
      type: "Video",
      description: "Posts with attached video content.",
    },
    {
      type: "Poll",
      description:
        "Interactive polls with configurable options and duration.",
    },
    {
      type: "Quote post",
      description: "Repost another post with added commentary.",
    },
    {
      type: "Reply",
      description:
        "Reply to existing posts for thread creation and conversations.",
    },
  ],
  platformConfigs: [
    {
      name: "Poll",
      field: "poll",
      description:
        "Create interactive polls with configurable options and duration.",
    },
    {
      name: "Reply settings",
      field: "reply_settings",
      description:
        "Restrict who can reply: followers, mentioned users, subscribers, or verified accounts.",
    },
    {
      name: "Community",
      field: "community_id",
      description: "Post directly to a specific X Community.",
    },
    {
      name: "Quote post",
      field: "quote_tweet_id",
      description: "Quote an existing post.",
    },
  ],
  useCases: [
    {
      title: "Build a social listening tool",
      description:
        "Post responses and track engagement metrics across X conversations from your analytics platform.",
    },
    {
      title: "Automate community engagement",
      description:
        "Schedule posts, polls, and thread replies to maintain consistent presence across X Communities.",
    },
    {
      title: "Cross-platform distribution",
      description:
        "Publish content to X alongside TikTok, Instagram, and LinkedIn with a single API call and platform-specific formatting.",
    },
  ],
};
