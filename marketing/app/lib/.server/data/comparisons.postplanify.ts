import type { CompetitorComparisonData } from "./comparisons";

export const postplanify: CompetitorComparisonData = {
  competitor: {
    name: "PostPlanify",
    slug: "postplanify",
    productType: "SaaS Dashboard",
    pricingModel: "Tiered",
    websiteUrl: "https://postplanify.com",
  },
  pricing: {
    rows: [
      {
        label: "Getting Started",
        pfm: "$10/mo",
        competitor: "$19/mo",
      },
      {
        label: "Pricing Model",
        pfm: "Fixed pricing based on post volume",
        competitor: "Tiered subscription",
      },
      {
        label: "Social Media Accounts",
        pfm: "Unlimited",
        competitor: "Capped (3 on Starter plan)",
      },
      {
        label: "Media Storage",
        pfm: "Free and unlimited",
        competitor: "Included",
      },
      {
        label: "Team Users",
        pfm: "Unlimited",
        competitor: "Unlimited",
      },
      {
        label: "Scaling and Growth",
        pfm: "Predictable pricing with no overage penalties",
        competitor: "Upgrade tiers for more social accounts",
      },
    ],
  },

  youMightUse: {
    competitorScenarios: [
      "You need a ready-made tool to manage your own social presence directly.",
      "You want AI help with writing captions and designing posts in Canva.",
      `You prefer a "buy" strategy over a "build" strategy for internal tools.`,
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
