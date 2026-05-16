import { BuildInPublic } from "./components/build-in-public";
import { FinalCta } from "./components/final-cta";
import { Hero } from "./components/hero";
import { WhyOpenSource } from "./components/why-open-source";

export function Component() {
  return (
    <div className="relative flex flex-col gap-0">
      <Hero />
      <WhyOpenSource />
      <FinalCta />
      <BuildInPublic />
    </div>
  );
}
