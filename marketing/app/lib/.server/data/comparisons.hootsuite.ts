import type { CompetitorComparisonData } from "./comparisons";

export const hootsuite: CompetitorComparisonData = {
  competitor: {
    name: "Hootsuite",
    slug: "hootsuite",
    productType: "SaaS Dashboard",
    pricingModel: "Per-Seat",
    websiteUrl: "https://hootsuite.com",
  },
  pricing: {
    rows: [
      {
        label: "Getting Started",
        pfm: "$10/mo",
        competitor: "Contact Sales (Enterprise pricing)",
      },
      {
        label: "Pricing Model",
        pfm: "Fixed pricing based on post volume",
        competitor: "Per-seat pricing with plan tiers",
      },
      {
        label: "Social Media Accounts",
        pfm: "Unlimited",
        competitor: "Capped by plan (e.g., 10 accounts)",
      },
      {
        label: "Media Storage",
        pfm: "Free and unlimited",
        competitor: "Available on Professional and Enterprise plans",
      },
      {
        label: "Team Users",
        pfm: "Unlimited – same price, no extra fees",
        competitor: "Pricing scales with team size (per-seat)",
      },
      {
        label: "Scaling and Growth",
        pfm: "Predictable pricing with no overage penalties",
        competitor: "Higher tiers required for more accounts/users",
      },
    ],
  },
  youMightUse: {
    competitorScenarios: [
      "You need enterprise-grade social listening and sentiment analysis capabilities.",
      "You are a large marketing team requiring approval workflows and ad management.",
      `You prefer a "buy" strategy over a "build" strategy for your internal social tools.`,
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
