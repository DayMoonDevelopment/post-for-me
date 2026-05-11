import type { CompetitorComparisonData } from "./comparisons";

export const buffer: CompetitorComparisonData = {
  competitor: {
    name: "Buffer",
    slug: "buffer",
    productType: "SaaS Dashboard",
    pricingModel: "Per-Profile",
    websiteUrl: "https://buffer.com",
  },
  pricing: {
    rows: [
      {
        label: "Getting Started",
        pfm: "$10/mo",
        competitor: "Free for 3 social channels (limit 10 posts)",
      },
      {
        label: "Pricing Model",
        pfm: "Fixed pricing based on post volume",
        competitor: "Pay per connected channel starting at $6/mo/channel",
      },
      {
        label: "Social Media Accounts",
        pfm: "Unlimited at no extra cost",
        competitor: "Charged per connected channel",
      },
      {
        label: "Media Storage",
        pfm: "Included",
        competitor: "Included",
      },
      {
        label: "Team Users",
        pfm: "Unlimited – same price, no extra fees",
        competitor: "Team plans start at $12/mo per channel",
      },
      {
        label: "Scaling and Growth",
        pfm: "Predictable pricing with no overage penalties",
        competitor: "Costs increase linearly with each new channel",
      },
    ],
  },

  youMightUse: {
    competitorScenarios: [
      "You need a pre-built visual dashboard for a marketing team to manage posts directly.",
      "You want built-in engagement tools like a social inbox for comments and DMs.",
      "You are managing a small number of channels for a single brand without developers.",
    ],
  },

  proposition: null,

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
