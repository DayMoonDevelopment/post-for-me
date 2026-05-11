import type { SolutionData } from "./solutions";

export const damTools: SolutionData = {
  id: "dam-tools",
  nav: {
    title: "Digital Asset Management",
    description: "Complete the asset lifecycle with direct social publishing and performance tracking",
  },
  meta: {
    title: "Social Publishing API for Digital Asset Management Tools | Post for Me",
    description:
      "Publish assets directly to social platforms from your DAM. Automate distribution, track asset performance, and manage media across 9 platforms. From $10/mo for 1,000 posts.",
  },
  hero: {
    headline: "From asset library to social audience with one click.",
    description:
      "Complete the digital asset lifecycle with direct social publishing from your DAM. One API handles distribution across 9 platforms with automatic media processing—enabling teams to publish, track performance, and manage rights without leaving your system.",
  },
  valueProposition: {
    headline: "Close the loop from creation to distribution",
    subheadline:
      "We handle social publishing infrastructure so you can focus on core DAM features like storage, search, versioning, and rights management.",
    weHandle: [
      "Multi-platform publishing infrastructure",
      "Media format conversion and optimization",
      "Platform-specific size and format requirements",
      "OAuth flows for social account connections",
      "Metadata mapping to social post fields",
      "Asset performance analytics across platforms",
      "Real-time publishing status notifications",
    ],
    youCan: [
      "Enable direct publishing from asset libraries",
      "Track which assets perform best on social",
      "Automate brand guidelines compliance for social posts",
      "Support rights-managed distribution workflows",
      "Build approval chains for asset publishing",
      "Focus on storage, search, and version control",
    ],
  },
  coreFeatures: {
    headline: "Asset distribution without the platform complexity",
    features: [
      {
        title: "Publish assets directly to social",
        description:
          "Let creative teams distribute final assets straight from your DAM to Instagram, TikTok, LinkedIn, and more. Automatic format optimization handles platform requirements. Support single assets or campaigns with multiple pieces—no manual downloading, resizing, or re-uploading.",
      },
      {
        title: "Track asset performance socially",
        description:
          "See which images, videos, and creative variations drive the most engagement. Aggregate performance data back into asset metadata. Identify top-performing content for reuse or optimization—completing the feedback loop from creation to performance analysis.",
      },
      {
        title: "Rights-managed distribution",
        description:
          "Control which users can publish which assets to which platforms. Integrate with approval workflows for brand compliance. Support expiration dates and usage restrictions for licensed content—all through the same API that handles publishing.",
      },
    ],
  },
  developerExperience: {
    headline: "Social distribution as a native DAM feature.",
    subheadline: "One API for publishing, performance tracking, and rights management.",
    benefits: [
      {
        title: "Built for media-rich workflows",
        description:
          "Handle high-resolution images, 4K video, and multi-asset campaigns. Automatic transcoding and optimization for each platform's requirements. Support batch publishing for seasonal campaigns or product launches—no manual file preparation required.",
      },
      {
        title: "Integrate with DAM architecture",
        description:
          "Trigger publishing from asset approval workflows or scheduled releases. Map DAM metadata to social post fields automatically. REST API and SDKs (TypeScript, Python, Go, Ruby, Kotlin) fit into existing asset management pipelines without rebuilding infrastructure.",
      },
      {
        title: "Analytics for asset intelligence",
        description:
          "Fetch social engagement metrics and store them alongside asset metadata. Build dashboards showing which creative styles, formats, or themes perform best. Webhooks notify when posts go live or engagement spikes—enabling real-time performance tracking for creative teams.",
      },
    ],
  },
};
