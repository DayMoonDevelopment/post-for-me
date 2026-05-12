import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { FacebookBrandIcon } from "~/components/facebook-brand-icon";
import { InstagramBrandIcon } from "~/components/instagram-brand-icon";
import { LinkedInBrandIcon } from "~/components/linkedin-brand-icon";
import { PinterestBrandIcon } from "~/components/pinterest-brand-icon";
import { ThreadsBrandIcon } from "~/components/threads-brand-icon";
import { TikTokBrandIcon } from "~/components/tiktok-brand-icon";
import { XBrandIcon } from "~/components/x-brand-icon";
import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";

interface OrbitConfig {
  radius: number;
  icons: React.ComponentType<{ className?: string }>[];
  duration: number;
  startAngles: number[];
}

const orbits: OrbitConfig[] = [
  {
    radius: 350,
    icons: [TikTokBrandIcon, InstagramBrandIcon, YouTubeBrandIcon],
    duration: 180,
    startAngles: [45, 165, 285], // Fixed starting positions spread out
  },
  {
    radius: 480,
    icons: [FacebookBrandIcon, XBrandIcon, ThreadsBrandIcon],
    duration: 240,
    startAngles: [0, 140, 250], // Offset from first orbit
  },
  {
    radius: 600,
    icons: [LinkedInBrandIcon, PinterestBrandIcon, BlueskyBrandIcon],
    duration: 300,
    startAngles: [90, 200, 320], // Different offset pattern
  },
];

interface OrbitingIconProps {
  Icon: React.ComponentType<{ className?: string }>;
  radius: number;
  angle: number;
  duration: number;
  index: number;
}

const OrbitingIcon = ({ Icon, index }: OrbitingIconProps) => {
  return (
    <div
      className={`orbit-icon-${index} absolute top-1/2 left-1/2 w-6 h-6 sm:w-8 sm:h-8`}
    >
      <div className="absolute -translate-x-1/2 -translate-y-1/2">
        <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
      </div>
    </div>
  );
};

export const OrbitingIcons = () => {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          ${orbits
            .flatMap((orbit, orbitIndex) =>
              orbit.icons.map((_, iconIndex) => {
                const globalIndex =
                  orbits
                    .slice(0, orbitIndex)
                    .reduce((sum, o) => sum + o.icons.length, 0) + iconIndex;
                const angle = orbit.startAngles[iconIndex];
                return `
                @keyframes orbit-mobile-${globalIndex} {
                  from {
                    transform: rotate(${angle}deg) translateX(${orbit.radius * 0.4}px) rotate(-${angle}deg);
                  }
                  to {
                    transform: rotate(${angle + 360}deg) translateX(${orbit.radius * 0.4}px) rotate(-${angle + 360}deg);
                  }
                }
                @keyframes orbit-desktop-${globalIndex} {
                  from {
                    transform: rotate(${angle}deg) translateX(${orbit.radius}px) rotate(-${angle}deg);
                  }
                  to {
                    transform: rotate(${angle + 360}deg) translateX(${orbit.radius}px) rotate(-${angle + 360}deg);
                  }
                }

                .orbit-icon-${globalIndex} {
                  animation: orbit-mobile-${globalIndex} ${orbit.duration}s linear infinite;
                }

                @media (min-width: 640px) {
                  .orbit-icon-${globalIndex} {
                    animation: orbit-desktop-${globalIndex} ${orbit.duration}s linear infinite;
                  }
                }

                .orbit-circle-${orbitIndex} {
                  width: ${orbit.radius * 0.8}px;
                  height: ${orbit.radius * 0.8}px;
                }

                @media (min-width: 640px) {
                  .orbit-circle-${orbitIndex} {
                    width: ${orbit.radius * 2}px;
                    height: ${orbit.radius * 2}px;
                  }
                }
              `;
              }),
            )
            .join("\n")}
        `,
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-radial from-background from-40% to-muted to-100%">
        <div className="relative w-full h-full max-w-35 max-h-35 sm:max-w-60 sm:max-h-60 md:max-w-87.5 md:max-h-87.5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[...orbits].reverse().map((orbit, reversedIndex) => {
              const orbitIndex = orbits.length - 1 - reversedIndex;
              const startIndex = orbits
                .slice(0, orbitIndex)
                .reduce((sum, o) => sum + o.icons.length, 0);

              return (
                <div
                  key={orbitIndex}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  {/* Circle with radial gradient */}
                  <div
                    className={`orbit-circle-${orbitIndex} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial from-background from-50% to-muted to-100% border-border/75`}
                  />

                  {/* Orbiting icons */}
                  {orbit.icons.map((Icon, iconIndex) => {
                    const globalIndex = startIndex + iconIndex;
                    const angle = orbit.startAngles[iconIndex];

                    return (
                      <OrbitingIcon
                        key={iconIndex}
                        Icon={Icon}
                        radius={orbit.radius}
                        angle={angle}
                        duration={orbit.duration}
                        index={globalIndex}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
