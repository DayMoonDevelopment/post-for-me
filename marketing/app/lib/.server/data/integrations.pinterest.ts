import type { IntegrationData } from "./integrations";

export const pinterest: IntegrationData = {
  id: "pinterest",
  name: "Pinterest",
  nav: {
    title: "Pinterest Integration",
    description:
      "Create Pins, manage boards, and track saves, impressions, and clicks.",
  },
  meta: {
    title: "Pinterest API Integration — Post for Me",
    description:
      "Create pins and boards on Pinterest through the Post for Me unified API. Schedule visual content across all platforms.",
  },
  hero: {
    headline: "Build Pinterest publishing into your platform",
    description:
      "Let your users create Pins, target boards, and track performance. Build Pin creation and board management into your product with one API.",
  },
  capabilities: {
    posting: {
      title: "Create Pins",
      description:
        "Publish Pins with images, descriptions, and destination links. Target specific boards for maximum reach.",
    },
    feeds: {
      title: "Read Pin libraries",
      description:
        "Pull a user's published Pins with metadata, images, and board associations.",
    },
    analytics: {
      title: "Get post analytics",
      description:
        "Access saves, impressions, and click-through data to measure what drives traffic.",
    },
  },
  connectionTypes: [
    {
      name: "Pinterest Account",
      description:
        "Connect Pinterest accounts to create Pins and manage boards. Sandbox mode available for development and testing.",
      authMethod: "OAuth 2.0",
      notes:
        "Basic auth for token refresh. Sandbox mode available for development and testing.",
    },
  ],
  postTypes: [
    {
      type: "Pin",
      description:
        "Standard image Pins with title, description, and destination link.",
    },
  ],
  platformConfigs: [
    {
      name: "Board targeting",
      field: "board_ids",
      description:
        "Select specific boards for Pin placement and organization.",
    },
    {
      name: "Destination link",
      field: "link",
      description:
        "Attach external URLs to drive traffic from Pins to your website.",
    },
  ],
  useCases: [
    {
      title: "Automate product Pins",
      description:
        "Sync your e-commerce product catalog to Pinterest by automatically creating Pins with product images, descriptions, and purchase links.",
    },
    {
      title: "Build a visual planner",
      description:
        "Let users plan and schedule Pins across multiple boards with a drag-and-drop content calendar.",
    },
    {
      title: "Track content ROI",
      description:
        "Pull Pin analytics into unified dashboards to measure saves, impressions, and click-through rates alongside other platforms.",
    },
  ],
};
