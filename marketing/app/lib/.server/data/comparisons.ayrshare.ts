import type { CompetitorComparisonData } from "./comparisons";

export const ayrshare: CompetitorComparisonData = {
  competitor: {
    name: "Ayrshare",
    slug: "ayrshare",
    productType: "API Infrastructure",
    pricingModel: "Per-Profile",
    websiteUrl: "https://ayrshare.com",
  },
  pricing: {
    rows: [
      {
        label: "Getting Started",
        pfm: "$10/mo",
        competitor: "$149/mo (Premium tier)",
      },
      {
        label: "Pricing Model",
        pfm: "Fixed pricing based on post volume",
        competitor: "Per-profile pricing with tier caps",
      },
      {
        label: "Social Media Accounts",
        pfm: "Unlimited",
        competitor: "Tiered limits (e.g., 10 or 30 profiles)",
      },
      {
        label: "Media Storage",
        pfm: "Free and unlimited",
        competitor: "Available on Premium, Business, Enterprise plans",
      },
      {
        label: "Team Users",
        pfm: "Unlimited – same price, no extra fees",
        competitor: "You are not charged for engineers, product managers, support staff, internal users or logins",
      },
      {
        label: "Scaling and Growth",
        pfm: "Predictable pricing with no overage penalties",
        competitor: "Higher tiers required for more profiles",
      },
    ],
  },

  youMightUse: {
    competitorScenarios: [
      "You're building a SaaS product that needs to post on behalf of your users.",
      "You require management of paid ads.",
      "You require access to a social media platform that Post for Me doesn't support (yet, we're probably working on it!).",
    ],
  },
  features: {
    sdks: [
      {
        name: "TypeScript/JavaScript",
        pfmAvailable: true,
        competitorAvailable: true,
      },
      {
        name: "Python",
        pfmAvailable: true,
        competitorAvailable: true,
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
  proposition: null,
};
