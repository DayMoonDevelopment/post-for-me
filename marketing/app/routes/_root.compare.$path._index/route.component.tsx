import { Hero } from "./components/hero";
import { IntentOfUseNotice } from "./components/intent-of-use-notice";
import { KeyFeatures } from "./components/key-features";
import { PricingTable } from "./components/pricing-table";
import { Proposition } from "./components/proposition";
import { SdkComparison } from "./components/sdk-comparison";
import { YouMightUse } from "./components/you-might-use";

export function Component() {
  return (
    <div className="flex flex-col">
      <Hero />
      <KeyFeatures />
      <PricingTable />
      <Proposition />
      <YouMightUse />
      <SdkComparison />
      <IntentOfUseNotice />
    </div>
  );
}
