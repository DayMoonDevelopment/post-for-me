import type { IntegrationData } from "./integrations";

export const linkedin: IntegrationData = {
  id: "linkedin",
  name: "LinkedIn",
  nav: {
    title: "LinkedIn Integration",
    description:
      "Publish to personal profiles and company pages with post analytics and feed access.",
  },
  meta: {
    title: "LinkedIn API Integration — Post for Me",
    description:
      "Publish posts and articles to LinkedIn profiles and company pages through the Post for Me unified API.",
  },
  hero: {
    headline: "Add LinkedIn publishing to your platform",
    description:
      "Let your users post to personal profiles and company pages on LinkedIn. Track engagement and manage multiple accounts through a single API.",
  },
  capabilities: {
    posting: {
      title: "Post to profiles and pages",
      description:
        "Publish text, images, and videos to personal LinkedIn profiles or company pages. Same workflow for both.",
    },
    feeds: {
      title: "Read published posts",
      description:
        "Pull posts from personal and organization accounts with metadata and media attachments.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Access impressions, engagement rates, clicks, and video metrics for both personal and company content.",
    },
  },
  connectionTypes: [
    {
      name: "Personal Profile",
      description:
        "Users connect their LinkedIn account and content appears on their personal feed.",
      authMethod: "OAuth 2.0",
      notes:
        "Best for thought leadership tools and personal branding apps.",
    },
    {
      name: "Organization Page",
      description:
        "Connect LinkedIn Company Pages for brand publishing. Requires page admin access.",
      authMethod: "OAuth 2.0",
      notes:
        "Best for social media management tools and corporate communications.",
    },
  ],
  postTypes: [
    {
      type: "Text",
      description: "Professional text updates for profiles and pages.",
    },
    {
      type: "Image",
      description: "Single or batch image posts with text captions.",
    },
    {
      type: "Video",
      description:
        "Native video uploads for higher reach and engagement.",
    },
  ],
  platformConfigs: [],
  useCases: [
    {
      title: "Power B2B social selling",
      description:
        "Let sales teams schedule and publish thought leadership content to their personal LinkedIn profiles from your CRM or sales enablement tool.",
    },
    {
      title: "Automate company page updates",
      description:
        "Push press releases, product launches, and team announcements to company pages from your internal communications platform.",
    },
    {
      title: "Build employer brand tools",
      description:
        "Create tools that help HR teams publish job postings, culture content, and employee spotlights across company pages.",
    },
  ],
};
