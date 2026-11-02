import { PostForMeIcon } from "~/icons";
import { cn } from "~/lib/utils";
import {
  BlueskyIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  ThreadsIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from "~/ui/brand-mark";
import { OrbitingCircles } from "~/ui/orbiting-circles";

/**
 * The brand hero: every supported platform orbiting the Post For Me mark —
 * the visual for "post everywhere from one place". Built from the in-house
 * `OrbitingCircles` + brand icons (animated, theme-aware, crisp at any size)
 * rather than a static raster. The orbit is deliberately slow/ambient.
 */
export function OrbitingPlatforms({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex min-h-44 w-full items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-primary/5 to-accent",
        className,
      )}
    >
      <OrbitingCircles radius={50} duration={55} iconSize={30}>
        <InstagramIcon className="size-6" />
        <TikTokIcon className="size-6" />
        <YouTubeIcon className="size-6" />
        <XIcon className="size-5" />
      </OrbitingCircles>
      <OrbitingCircles radius={92} duration={85} iconSize={30} reverse>
        <FacebookIcon className="size-6" />
        <LinkedInIcon className="size-6" />
        <PinterestIcon className="size-6" />
        <ThreadsIcon className="size-6" />
        <BlueskyIcon className="size-6" />
      </OrbitingCircles>
      <div className="z-10 flex size-14 items-center justify-center rounded-full border border-border bg-background shadow-sm">
        <PostForMeIcon className="size-7" />
      </div>
    </div>
  );
}
