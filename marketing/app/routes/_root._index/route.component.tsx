import { Hero } from "./components/hero";
import { SocialMediaLogos } from "./components/social-media-logos";
import { ValueProps } from "./components/value-props";

export function Component() {
  return (
    <div className="relative flex flex-col gap-0">
      <div className="relative">
        <Hero />
      </div>

      <SocialMediaLogos />

      <ValueProps />
    </div>
  );
}
