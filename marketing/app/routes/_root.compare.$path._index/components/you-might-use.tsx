import { useLoaderData } from "react-router";

import type { Route } from "../+types/route";

const PFM_SCENARIOS = [
  "You're building a SaaS product that needs to post on behalf of your users",
  "You want predictable pricing that doesn't scale with team size or accounts",
  "You need programmatic control over posting with full API access",
];

export const YouMightUse = () => {
  const { comparison } = useLoaderData<Route.ComponentProps["loaderData"]>();

  if (!comparison.youMightUse) {
    return null;
  }

  const { competitorScenarios } = comparison.youMightUse;

  return (
    <div className="bg-muted/30">
      <div className="max-w-(--breakpoint-xl) w-full py-16 px-4 mx-auto">
        <div className="flex flex-col gap-12 max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-[-0.03em] mb-4">
              Which One Is Right for You?
            </h2>
            <p className="text-muted-foreground text-lg text-balance">
              {`Different tools for different needs. Here's when each option makes sense.`}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-background rounded-xl border p-6">
              <h3 className="font-semibold text-lg mb-4">
                You might use Post for Me if...
              </h3>
              <ul className="space-y-3">
                {PFM_SCENARIOS.map((scenario, index) => (
                  <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="text-muted-foreground/60 shrink-0">•</span>
                    <span>{scenario}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background rounded-xl border p-6">
              <h3 className="font-semibold text-lg mb-4">
                You might use {comparison.competitor.name} if...
              </h3>
              <ul className="space-y-3">
                {competitorScenarios.map((scenario, index) => (
                  <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="text-muted-foreground/60 shrink-0">•</span>
                    <span>{scenario}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
