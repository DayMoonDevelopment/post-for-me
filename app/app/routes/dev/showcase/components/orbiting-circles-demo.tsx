import { PostForMeIcon } from "~/icons";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from "~/ui/brand-mark";
import { OrbitingCircles } from "~/ui/orbiting-circles";

import { Section } from "./section";

export function OrbitingCirclesDemo() {
  return (
    <div className="space-y-8">
      <Section title="Two rings, brand icons">
        <div className="relative flex h-80 w-full items-center justify-center overflow-hidden">
          <OrbitingCircles radius={60} duration={25} iconSize={28}>
            <InstagramIcon className="size-7" />
            <TikTokIcon className="size-7" />
            <YouTubeIcon className="size-7" />
          </OrbitingCircles>
          <OrbitingCircles radius={120} duration={40} iconSize={28} reverse>
            <FacebookIcon className="size-7" />
            <XIcon className="size-6" />
            <InstagramIcon variant="monochrome" className="size-7" />
          </OrbitingCircles>
          <div className="flex size-12 items-center justify-center rounded-full border border-border bg-background shadow-sm">
            <PostForMeIcon className="size-6" />
          </div>
        </div>
      </Section>
      <Section title="Without path circles">
        <div className="relative flex h-56 w-full items-center justify-center overflow-hidden">
          <OrbitingCircles radius={80} duration={20} iconSize={24} path={false}>
            <FacebookIcon className="size-6" />
            <YouTubeIcon className="size-6" />
            <TikTokIcon className="size-6" />
            <XIcon className="size-5" />
          </OrbitingCircles>
          <p className="text-sm text-muted-foreground">path=false</p>
        </div>
      </Section>
    </div>
  );
}
