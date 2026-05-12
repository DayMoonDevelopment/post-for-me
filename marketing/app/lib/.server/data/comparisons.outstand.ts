import type { CompetitorComparisonData } from "./comparisons";

export const outstand: CompetitorComparisonData = {
  competitor: {
    name: "Outstand",
    slug: "outstand",
    productType: "API Infrastructure",
    pricingModel: "Hybrid",
    websiteUrl: "https://outstand.so",
  },
  pricing: {
    rows: [
      {
        label: "Getting Started",
        pfm: "$10/mo",
        competitor: "$5/mo (+ $0.01 per post over 1,000)",
      },
      {
        label: "Pricing Model",
        pfm: "Fixed pricing based on post volume",
        competitor: "Hybrid base cost + usage-based fees",
      },
      {
        label: "Social Media Accounts",
        pfm: "Unlimited",
        competitor: "Unlimited",
      },
      {
        label: "Media Storage",
        pfm: "Included",
        competitor: "Included",
      },
      {
        label: "Team Users",
        pfm: "Included",
        competitor: "Included",
      },
      {
        label: "Scaling and Growth",
        pfm: "Predictable pricing with no overage penalties",
        competitor: "Usage price fees add up unpredictibly at scale",
      },
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
