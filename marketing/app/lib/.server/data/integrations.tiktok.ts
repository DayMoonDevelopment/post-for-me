import type { IntegrationData } from "./integrations";

export const tiktok: IntegrationData = {
  id: "tiktok",
  name: "TikTok",
  nav: {
    title: "TikTok Integration",
    description:
      "Publish videos, fetch feeds, and track analytics on TikTok. Supports both the TikTok API and TikTok Business API.",
  },
  meta: {
    title: "TikTok API Integration — Post for Me",
    description:
      "Post videos, fetch feeds, and track analytics on TikTok through the Post for Me unified API. One integration to publish across all major platforms.",
  },
  hero: {
    headline: "Ship TikTok integrations without the complexity",
    description:
      "Add TikTok video publishing to your product with a single API. Let your users post, track performance, and manage their accounts.",
  },
  capabilities: {
    posting: {
      title: "Publish and schedule videos",
      description:
        "Post videos to TikTok instantly or schedule them for later. Control privacy, comments, duets, stitches, and branded content settings.",
    },
    feeds: {
      title: "Read TikTok feeds",
      description:
        "Pull a user's published videos with view counts, engagement metrics, and metadata. Perfect for building content dashboards.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Access views, likes, comments, and shares. TikTok Business accounts unlock deeper insights like impressions and audience demographics.",
    },
  },
  connectionTypes: [
    {
      name: "TikTok API",
      description:
        "The standard TikTok developer API. Publish videos, create drafts, and track core engagement metrics like views, likes, and shares.",
      authMethod: "OAuth 2.0",
      notes: "Best for apps focused on content publishing and basic analytics.",
    },
    {
      name: "TikTok Business API",
      description:
        "Extended API with deeper post analytics, audience demographics, and impression data. Built for data-heavy applications.",
      authMethod: "OAuth 2.0",
      notes:
        "Best for analytics platforms, agency tools, and campaign management.",
    },
  ],
  postTypes: [
    {
      type: "Video",
      description:
        "Standard video uploads with configurable privacy, interaction controls, and content disclosures.",
    },
    {
      type: "Photo Post",
      description:
        "Photo-based posts with optional auto-added music (Business API).",
    },
  ],
  platformConfigs: [
    {
      name: "Title",
      field: "title",
      description: "Set a custom title for the video post.",
    },
    {
      name: "Privacy status",
      field: "privacy_status",
      description: "Set videos to public or private visibility.",
    },
    {
      name: "Comment control",
      field: "allow_comment",
      description: "Enable or disable comments on published videos.",
    },
    {
      name: "Duet",
      field: "allow_duet",
      description: "Allow other users to create duets with your content.",
    },
    {
      name: "Stitch",
      field: "allow_stitch",
      description: "Allow other users to create stitches with your content.",
    },
    {
      name: "Brand disclosure",
      field: "disclose_your_brand",
      description: "Flag content as your own branded content for compliance.",
    },
    {
      name: "AI-generated flag",
      field: "is_ai_generated",
      description: "Mark content as AI-generated for transparency.",
    },
    {
      name: "TikTok app draft",
      field: "is_draft",
      description:
        "Create drafts in the TikTok app for users to review and publish manually.",
    },
  ],
  useCases: [
    {
      title: "Automate creator workflows",
      description:
        "Let creators schedule and publish TikTok videos from your platform without switching apps.",
    },
    {
      title: "Cross-post short-form video",
      description:
        "Publish the same video to TikTok, Instagram Reels, and YouTube Shorts with a single API call.",
    },
    {
      title: "Track video performance",
      description:
        "Pull engagement data into dashboards so creators and brands can measure ROI across campaigns.",
    },
  ],
};
