import { Hero } from "./components/hero";
import { SocialMediaLogos } from "./components/social-media-logos";

export function Component() {
  return (
    <div className="relative flex flex-col gap-12">
      <div className="relative">
        <Hero />
      </div>

      <SocialMediaLogos />
    </div>
  );
}
