import type { CompetitorComparisonData } from "./comparisons";

export const zernio: CompetitorComparisonData = {
  competitor: {
    name: "Zernio",
    slug: "zernio",
    productType: "API Infrastructure",
    pricingModel: "Per-Profile",
    websiteUrl: "https://zernio.com",
  },
  pricing: {
    rows: [
      {
        label: "Getting Started",
        pfm: "$10/mo for 1,000 posts",
        competitor: "Free for first 2 connected accounts, then $6/account/mo",
      },
      {
        label: "Pricing Model",
        pfm: "Fixed pricing based on post volume",
        competitor: "Per connected social account, per month",
      },
      {
        label: "Social Media Accounts",
        pfm: "Unlimited",
        competitor: "Charged per account ($1–$6/account/mo by tier)",
      },
      {
        label: "Analytics",
        pfm: "Included",
        competitor: "Included",
      },
      {
        label: "Media Storage",
        pfm: "Included",
        competitor: "Not specified",
      },
      {
        label: "Team Users",
        pfm: "Unlimited",
        competitor: "Not specified",
      },
      {
        label: "X (Twitter) API Costs",
        pfm: "Included",
        competitor: "Pass-through ($0.005/read, $0.010/write, $0.015/DM)",
      },
      {
        label: "Scaling and Growth",
        pfm: "Predictable pricing with no overage penalties",
        competitor: "Bill grows with every connected account you onboard",
      },
    ],
  },

  youMightUse: {
    competitorScenarios: [
      "You require access to a social media platform that Post for Me doesn't support yet (Zernio publishes to channels like WhatsApp, Telegram, Discord, Snapchat, and Google Business).",
      "You need unified ad campaign management across networks like Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, Pinterest Ads, and X Ads.",
      "You're already integrated with Late or Zernio.",
    ],
  },
  proposition: {
    title: "Stop paying a tax on your own growth.",
    description:
      "True infrastructure should function like a utility: you pay for what you process, not for how many users you have. Zernio's per-connected-account pricing is the textbook example of the model we believe is fundamentally broken — every user you onboard is a recurring line item on your bill, whether they post once a month or never at all.\n\nWith Post for Me, a connected user costs you $0. You can onboard ten users or ten million. We only charge you when they actually post. Build your user base without worrying about your infrastructure bill punishing you for it.",
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
