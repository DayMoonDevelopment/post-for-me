import type { IntegrationData } from "./integrations";

export const instagram: IntegrationData = {
  id: "instagram",
  name: "Instagram",
  nav: {
    title: "Instagram Integration",
    description:
      "Publish photos, videos, Reels, carousels, and Stories with two connection methods.",
  },
  meta: {
    title: "Instagram API Integration — Post for Me",
    description:
      "Post photos, carousels, reels, and stories to Instagram through the Post for Me unified API. Schedule content and track analytics.",
  },
  hero: {
    headline: "Two ways to connect Instagram, zero headaches",
    description:
      "Let your users publish photos, Reels, Stories, and carousels to Instagram from your app. Support both Instagram and Facebook login methods through one API.",
  },
  capabilities: {
    posting: {
      title: "Post every format",
      description:
        "Publish photos, videos, carousels, Reels, and Stories. Tag collaborators, set locations, and control where content appears.",
    },
    feeds: {
      title: "Read media libraries",
      description:
        "Pull a user's published posts with media URLs and engagement counts for display or management.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Track likes, comments, shares, views, and reach to understand what content resonates on Instagram.",
    },
  },
  connectionTypes: [
    {
      name: "Log in with Instagram",
      description:
        "Users log in with their Instagram credentials. Simpler flow, no Facebook involved.",
      authMethod: "OAuth 2.0",
      notes:
        "Best for apps where users connect personal Instagram accounts directly.",
    },
    {
      name: "Log in with Facebook",
      description:
        "Users log in with Facebook and select a linked Instagram account.",
      authMethod: "OAuth 2.0",
      notes:
        "Best for agencies and brands managing Instagram through Facebook.",
    },
  ],
  postTypes: [
    {
      type: "Image",
      description: "Single photo posts with captions and location tags.",
    },
    {
      type: "Video",
      description: "Standard video posts to the Instagram feed.",
    },
    {
      type: "Carousel",
      description:
        "Multi-image or mixed media carousels with up to 10 items.",
    },
    {
      type: "Reel",
      description:
        "Short-form vertical video with optional collaborators and trial reel settings.",
    },
    {
      type: "Story",
      description: "Ephemeral photo or video content in Instagram Stories.",
    },
  ],
  platformConfigs: [
    {
      name: "Placement",
      field: "placement",
      description:
        "Target specific placements: timeline, Reels, or Stories.",
    },
    {
      name: "Collaborators",
      field: "collaborators",
      description:
        "Tag Instagram usernames as collaborators on posts and Reels.",
    },
    {
      name: "Share to feed",
      field: "share_to_feed",
      description:
        "Control whether Reels also appear in the main feed grid.",
    },
    {
      name: "Location",
      field: "location",
      description: "Attach geographic location data to posts and Reels.",
    },
    {
      name: "Trial reel type",
      field: "trial_reel_type",
      description:
        "Set to manual or performance-based for Reels distribution control.",
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
      title: "Build a visual content scheduler",
      description:
        "Let users plan and schedule Instagram grids, Reels, and Stories with preview layouts and optimal posting times.",
    },
    {
      title: "Automate influencer campaigns",
      description:
        "Publish campaign content to multiple Instagram accounts simultaneously with collaborator tagging and branded content flags.",
    },
    {
      title: "Sync product catalogs",
      description:
        "Automatically create Instagram posts and carousels from product feeds to drive social commerce.",
    },
  ],
};
