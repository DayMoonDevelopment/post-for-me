import { CodeExamplesSection } from "~/components/code-examples-section";
import { OpenSource } from "~/components/open-source-section";
import { SetupOptionsSection } from "~/components/setup-options-section";

import { FeatureCards } from "./components/feature-cards";
import { Header } from "./components/header";

export function Component() {
  return (
    <div className="flex flex-col pt-16">
      <Header />
      <FeatureCards />
      <CodeExamplesSection />
      <SetupOptionsSection />
      <OpenSource />
    </div>
  );
}
