import type { IntegrationData } from "./integrations";

export const facebook: IntegrationData = {
  id: "facebook",
  name: "Facebook",
  nav: {
    title: "Facebook Integration",
    description:
      "Post to Pages, read feeds, and access analytics through the Facebook Graph API.",
  },
  meta: {
    title: "Facebook API Integration — Post for Me",
    description:
      "Publish posts, manage pages, and track engagement on Facebook through the Post for Me unified API. One integration for every platform.",
  },
  hero: {
    headline: "Add Facebook publishing to your app in hours",
    description:
      "Enable your users to publish to Facebook Pages from your app. Text, images, videos, Reels, and Stories through a single API.",
  },
  capabilities: {
    posting: {
      title: "Publish to Pages",
      description:
        "Post text, images, videos, Reels, and Stories to Facebook Pages. Schedule content and customize it per placement.",
    },
    feeds: {
      title: "Read Page feeds",
      description:
        "Pull published posts with engagement counts and media attachments for content management and display.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Access likes, comments, shares, and reach data to measure how your content performs on Facebook.",
    },
  },
  connectionTypes: [
    {
      name: "Facebook Page",
      description:
        "Connect Facebook Pages and start publishing. Post for Me handles token management and refresh automatically.",
      authMethod: "OAuth 2.0",
      notes:
        "Long-lived tokens with automatic 60-day refresh. Supports Page-level posting and insights.",
    },
  ],
  postTypes: [
    {
      type: "Text",
      description: "Plain text posts to Facebook Pages.",
    },
    {
      type: "Image",
      description: "Single or multiple image posts with captions.",
    },
    {
      type: "Video",
      description:
        "Video uploads with placement options for timeline, Reels, or Stories.",
    },
    {
      type: "Reel",
      description:
        "Short-form vertical video published as a Facebook Reel.",
    },
    {
      type: "Story",
      description: "Ephemeral content published to Facebook Stories.",
    },
  ],
  platformConfigs: [
    {
      name: "Placement",
      field: "placement",
      description:
        "Choose where content appears: timeline, Reels, or Stories.",
    },
    {
      name: "Location",
      field: "location",
      description: "Attach geographic location data to posts.",
    },
    {
      name: "Media tags",
      field: "media.tags",
      description:
        "Tag users or products with coordinates on media.",
    },
  ],
  useCases: [
    {
      title: "Manage client Pages",
      description:
        "Build tools that let agencies publish and schedule content across dozens of Facebook Pages from a single dashboard.",
    },
    {
      title: "Automate e-commerce posts",
      description:
        "Push product announcements, sales, and inventory updates to Facebook Pages automatically from your e-commerce platform.",
    },
    {
      title: "Aggregate engagement data",
      description:
        "Pull Page insights into unified analytics dashboards alongside other platform metrics.",
    },
  ],
};
