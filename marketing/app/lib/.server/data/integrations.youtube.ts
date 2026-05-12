import type { IntegrationData } from "./integrations";

export const youtube: IntegrationData = {
  id: "youtube",
  name: "YouTube",
  nav: {
    title: "YouTube Integration",
    description:
      "Upload videos, manage channel content, and access deep analytics via the YouTube Data API.",
  },
  meta: {
    title: "YouTube API Integration — Post for Me",
    description:
      "Upload videos, shorts, and manage content on YouTube through the Post for Me unified API. One integration for every platform.",
  },
  hero: {
    headline: "Add YouTube publishing to your platform in a single sprint",
    description:
      "Enable video uploads and publishing in your app through a single API. Track views, watch time, and engagement for each video.",
  },
  capabilities: {
    posting: {
      title: "Upload videos",
      description:
        "Publish videos with custom titles, privacy settings, and made-for-kids compliance. Schedule uploads for the right time.",
    },
    feeds: {
      title: "Read channel content",
      description:
        "Pull video lists with metadata, thumbnails, and publication details from any connected channel.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Access views, watch time, shares, subscribers gained and lost, and audience retention data.",
    },
  },
  connectionTypes: [
    {
      name: "YouTube Channel",
      description:
        "Connect YouTube channels and start uploading. Post for Me handles Google authentication and token refresh behind the scenes.",
      authMethod: "OAuth 2.0 (Google)",
      notes:
        "Google OAuth with automatic token refresh. Supports all YouTube channel operations.",
    },
  ],
  postTypes: [
    {
      type: "Video",
      description:
        "Standard video uploads with custom title, description, and metadata.",
    },
  ],
  platformConfigs: [
    {
      name: "Title",
      field: "title",
      description:
        "Set a custom title for the uploaded video, separate from the post caption.",
    },
    {
      name: "Privacy status",
      field: "privacy_status",
      description:
        "Set videos to public, private, or unlisted visibility.",
    },
    {
      name: "Made for Kids",
      field: "made_for_kids",
      description:
        "Flag content as made for children to comply with YouTube's COPPA requirements.",
    },
  ],
  useCases: [
    {
      title: "Distribute video at scale",
      description:
        "Upload the same video to YouTube, TikTok, and Instagram Reels with platform-specific titles and descriptions in a single API call.",
    },
    {
      title: "Build a video management dashboard",
      description:
        "Create tools that let creators upload, organize, and track YouTube video performance alongside other platforms.",
    },
    {
      title: "Automate channel analytics",
      description:
        "Pull YouTube Analytics data into custom dashboards for watch time, subscriber growth, and audience engagement reporting.",
    },
  ],
};
