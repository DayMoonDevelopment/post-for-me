import { IconCircleCheck } from "@central-icons/outlined";

const features = [
  {
    title: "Unified API",
    description:
      "Post once, distribute everywhere. Fetch feeds and analytics seamlessly across 9 platforms through a single integration.",
  },
  {
    title: "Developer-Friendly",
    description:
      "Excellent documentation, transparent design, and an API built by developers who understand what you need.",
  },
  {
    title: "Scalable Pricing",
    description:
      "Start at $10/month for 1,000 posts. Scale infinitely without cost-prohibitive jumps or limits that compromise your product.",
  },
  {
    title: "Open Source",
    description:
      "View and contribute to the code on GitHub. Full transparency builds trust and ensures you can verify what happens with your data.",
  },
  {
    title: "No Arbitrary Limits",
    description:
      "Unlimited accounts, API keys, and team members on all plans. No per-seat pricing or account caps that restrict how you build.",
  },
  {
    title: "Focus on Essentials",
    description:
      "No bloat, no unnecessary features. Integrate quickly and get back to building what matters for your users.",
  },
];

export const Differentiators = () => {
  return (
    <div className="w-full bg-muted py-10">
      <div className="max-w-(--breakpoint-xl) mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="shrink-0 mt-1">
                  <IconCircleCheck className="size-6 text-pop" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="mt-1 text-sm md:text-base text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
