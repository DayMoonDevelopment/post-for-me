import { tiers, baseFeatures } from "./data/prices";

export function loader() {
  return {
    tiers: tiers.map((tier) => ({
      ...tier,
      features: [
        `Up to ${tier.posts.toLocaleString()} successful posts per month`,
        ...baseFeatures,
      ],
    })),
  };
}
