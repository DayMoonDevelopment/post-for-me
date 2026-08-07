import { PostForMeIcon } from "~/icons";
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

/** Orbiting icons render inside uniform chips so they read as a system. */
function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-11 items-center justify-center">{children}</div>
  );
}

/**
 * Largest ring first so the concentric discs paint back-to-front. Each disc
 * alternates tone slightly to create visible banding; strokes come from the
 * OrbitingCircles paths.
 */
const rings = [
  {
    radius: 188,
    duration: 75,
    reverse: false,
    icons: [LinkedInIcon, PinterestIcon, BlueskyIcon],
  },
  {
    radius: 128,
    duration: 55,
    reverse: true,
    icons: [FacebookIcon, XIcon, ThreadsIcon],
  },
  {
    radius: 68,
    duration: 35,
    reverse: false,
    icons: [InstagramIcon, TikTokIcon, YouTubeIcon],
  },
];

/**
 * Right-hand panel of the login card — the marketing hero's orb circles
 * with the social platform icons orbiting the Post for Me mark.
 */
export function HeroPanel() {
  return (
    <div className="relative hidden items-center justify-center overflow-hidden border-s border-border/60 bg-muted/50 md:flex">
      {/* concentric ground discs, back to front */}
      {rings.map((ring, i) => (
        <div
          key={ring.radius}
          aria-hidden
          className={
            i % 2 === 0
              ? "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background shadow-[inset_0_0_0_1px_var(--border)]"
              : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/60 shadow-[inset_0_0_0_1px_var(--border)]"
          }
          style={{ width: ring.radius * 2, height: ring.radius * 2 }}
        />
      ))}

      {/* soft glow behind the mark */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pop/15 blur-3xl"
      />

      {rings.map((ring) => (
        <OrbitingCircles
          key={ring.radius}
          radius={ring.radius}
          duration={ring.duration}
          reverse={ring.reverse}
          iconSize={44}
          path={false}
        >
          {ring.icons.map((Icon, i) => (
            <IconChip key={i}>
              <Icon className="size-8" />
            </IconChip>
          ))}
        </OrbitingCircles>
      ))}

      <div className="z-10 flex size-16 items-center justify-center bg-background rounded-full border-pop/10">
        <PostForMeIcon className="size-8" />
      </div>
    </div>
  );
}
