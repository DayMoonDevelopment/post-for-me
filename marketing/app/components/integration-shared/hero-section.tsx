import { IconSend, IconNewspaper, IconChart1 } from "@central-icons/filled";
import { IconArrowUpRight } from "@central-icons/outlined";

import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { FacebookBrandIcon } from "~/components/facebook-brand-icon";
import { InstagramBrandIcon } from "~/components/instagram-brand-icon";
import { Link } from "~/components/link";
import { LinkedInBrandIcon } from "~/components/linkedin-brand-icon";
import { PinterestBrandIcon } from "~/components/pinterest-brand-icon";
import { ThreadsBrandIcon } from "~/components/threads-brand-icon";
import { TikTokBrandIcon } from "~/components/tiktok-brand-icon";
import { XBrandIcon } from "~/components/x-brand-icon";
import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";

import { Button } from "~/ui/button";

import type { IntegrationData } from "~/lib/.server/data/integrations";

const brandIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  tiktok: TikTokBrandIcon,
  facebook: FacebookBrandIcon,
  instagram: InstagramBrandIcon,
  x: XBrandIcon,
  linkedin: LinkedInBrandIcon,
  pinterest: PinterestBrandIcon,
  bluesky: BlueskyBrandIcon,
  threads: ThreadsBrandIcon,
  youtube: YouTubeBrandIcon,
};

const featurePillars = [
  { label: "Posting", icon: IconSend },
  { label: "Feeds", icon: IconNewspaper },
  { label: "Analytics", icon: IconChart1 },
];

interface HeroSectionProps {
  integration: IntegrationData;
}

export const HeroSection = ({ integration }: HeroSectionProps) => {
  const BrandIcon = brandIcons[integration.id];

  return (
    <div className="dark bg-background text-foreground">
      <div className="max-w-(--breakpoint-xl) w-full flex flex-col gap-10 py-16 px-6 mx-auto">
        {/* App icon */}
        <div className="light flex items-center justify-center size-16 rounded-2xl bg-white shadow-sm">
          {BrandIcon ? <BrandIcon className="size-9" /> : null}
        </div>

        {/* Title + description in 5-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12">
          <div className="lg:col-span-3 flex flex-col gap-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
              {`Use Post for Me to quickly integrate your app with ${integration.name}`}
            </h1>
            <div className="hidden lg:flex flex-row gap-3">
              <Button asChild size="lg">
                <Link to="https://app.postforme.dev">
                  Get Started
                  <IconArrowUpRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="https://api.postforme.dev/docs">View API Docs</Link>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-6">
            <p className="text-xl text-muted-foreground">
              {integration.hero.description}
            </p>
            <div className="flex lg:hidden flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link to="https://app.postforme.dev">
                  Get Started
                  <IconArrowUpRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="https://api.postforme.dev/docs">View API Docs</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Feature pillars */}
        <div className="flex flex-wrap gap-6 border-t border-border pt-8">
          {featurePillars.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-9 rounded-lg bg-white/15">
                <Icon className="size-4 text-pop" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
