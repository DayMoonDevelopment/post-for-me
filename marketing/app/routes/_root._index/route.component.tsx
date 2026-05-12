import { OpenSource } from "~/components/open-source-section";
import { SetupOptionsSection } from "~/components/setup-options-section";

import { FAQ } from "./components/faq";
import { Hero } from "./components/hero";
import { Integration } from "./components/integration";
import { SocialMediaLogos } from "./components/social-media-logos";
import { Solutions } from "./components/solutions";
import { ValueProps } from "./components/value-props";

export function Component() {
  return (
    <div className="relative flex flex-col gap-0">
      <div className="relative">
        <Hero />
      </div>

      <SocialMediaLogos />

      <ValueProps />

      <Integration />

      <SetupOptionsSection />

      <Solutions />

      <FAQ />

      <OpenSource />
    </div>
  );
}
