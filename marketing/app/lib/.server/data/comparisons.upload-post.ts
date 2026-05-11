import type { CompetitorComparisonData } from "./comparisons";

export const uploadPost: CompetitorComparisonData = {
  competitor: {
    name: "Upload-Post",
    slug: "upload-post",
    productType: "Automation Tool",
    pricingModel: "Tiered",
    websiteUrl: "https://upload-post.com",
  },
  pricing: {
    rows: [
      {
        label: "Getting Started",
        pfm: "$10/mo",
        competitor: "Free (10 posts/mo)",
      },
      {
        label: "Pricing Model",
        pfm: "Fixed pricing based on post volume",
        competitor: "Tiered by profile count",
      },
      {
        label: "Social Media Accounts",
        pfm: "Unlimited",
        competitor: "Strict caps on accounts and posts",
      },
      {
        label: "Media Storage",
        pfm: "Free and unlimited",
        competitor: "Based on tier",
      },
      {
        label: "Team Users",
        pfm: "Unlimited – same price, no extra fees",
        competitor: "Based on tier",
      },
      {
        label: "Scaling and Growth",
        pfm: "Predictable pricing with no overage penalties",
        competitor: "Higher tiers for more social media accounts, posts, media storage, and team members.",
      },
    ],
  },

  youMightUse: {
    competitorScenarios: [
      "You are an individual creator automating your own content distribution.",
      "You need heavy-duty video transcoding control via FFmpeg.",
      "You require access to a social media platform that Post for Me doesn't support (yet, we're probably working on it!).",
    ],
  },
  proposition: {
    title: "Stop paying a tax on your own growth.",
    description: "True infrastructure should function like a utility: you pay for what you process, not for how many users you have. Many social APIs impose arbitrary limits on \"connected accounts\" or \"social profiles,\" forcing you into expensive enterprise tiers just because you successfully onboarded more users. We believe that is fundamentally broken. It's a tax on your success.\n\nWith Post for Me, a connected user costs you $0. You can onboard ten users or ten million. We only charge you when they actually post. Build your user base without worrying about your infrastructure bill punishing you for it.",
  },
  features: {
    sdks: [
      {
        name: "TypeScript/JavaScript",
        pfmAvailable: true,
        competitorAvailable: false,
      },
      {
        name: "Python",
        pfmAvailable: true,
        competitorAvailable: false,
      },
      {
        name: "Go",
        pfmAvailable: true,
        competitorAvailable: false,
      },
      {
        name: "Ruby",
        pfmAvailable: true,
        competitorAvailable: false,
      },
    ],
  },
};
