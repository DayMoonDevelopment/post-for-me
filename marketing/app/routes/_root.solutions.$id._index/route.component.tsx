import { SetupOptionsSection as SetupOptions } from "~/components/setup-options-section";

import { CoreFeatures } from "./components/core-features";
import { DeveloperExperience } from "./components/developer-experience";
import { FAQ } from "./components/faq";
import { Hero } from "./components/hero";
import { Pricing } from "./components/pricing";
import { ValueProposition } from "./components/value-proposition";

export function Component() {
  return (
    <div className="flex flex-col pt-16">
      <Hero />
      <ValueProposition />
      <CoreFeatures />
      <DeveloperExperience />
      <SetupOptions />
      <Pricing />
      <FAQ />
    </div>
  );
}
