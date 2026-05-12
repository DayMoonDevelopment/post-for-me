import { IconSend, IconNewspaper, IconChart1 } from "@central-icons/filled";
import { IconArrowUpRight } from "@central-icons/outlined";
import { Link, useLoaderData } from "react-router";

import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { FacebookBrandIcon } from "~/components/facebook-brand-icon";
import { InstagramBrandIcon } from "~/components/instagram-brand-icon";
import { LinkedInBrandIcon } from "~/components/linkedin-brand-icon";
import { PinterestBrandIcon } from "~/components/pinterest-brand-icon";
import { ThreadsBrandIcon } from "~/components/threads-brand-icon";
import { TikTokBrandIcon } from "~/components/tiktok-brand-icon";
import { XBrandIcon } from "~/components/x-brand-icon";
import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";

import { cn } from "~/lib/utils";

import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";

import type { Route } from "./+types/route";

const integrationIcons: Record<
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

const capabilityIcons = {
  posting: IconSend,
  feeds: IconNewspaper,
  analytics: IconChart1,
} as const;

export function Component() {
  const { integrations } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="flex flex-col pt-16">
      {/* Hero Section */}
      <div className="dark bg-background text-foreground">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              9 platforms, one API
            </Badge>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em]">
              Platform Integrations
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
              Integrate posting, feeds, and analytics across TikTok, Facebook,
              Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, and YouTube.
              One REST API replaces months of platform-by-platform integration
              work.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
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
      </div>

      {/* Capabilities Legend */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 pt-16 pb-8">
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          {Object.entries(capabilityIcons).map(([key, Icon]) => (
            <div key={key} className="flex items-center gap-2">
              <Icon className="size-4 text-pop" />
              <span className="capitalize">{key}</span>
            </div>
          ))}
          <span className="text-muted-foreground/60">
            — Available on every platform
          </span>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => {
            const Icon = integrationIcons[integration.id];

            return (
              <Link
                key={integration.id}
                to={`/integrations/${integration.id}`}
                className={cn(
                  "group relative flex flex-col p-6 rounded-lg border border-border",
                  "bg-card hover:bg-accent/50 transition-colors duration-200",
                  "hover:border-primary/50",
                )}
              >
                {/* Platform Icon */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted border border-border">
                    {Icon ? <Icon className="size-7" /> : null}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {integration.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      {Object.entries(capabilityIcons).map(([key, CapIcon]) => (
                        <CapIcon
                          key={key}
                          className="size-3.5 text-pop"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  {integration.nav.description}
                </p>

                {/* Arrow indicator */}
                <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View integration
                  <svg
                    className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="bg-muted">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em]">
              Every integration includes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              No matter which platforms you integrate, you get the same
              developer experience and infrastructure.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "OAuth handled for you",
                description:
                  "We manage authorization flows, token storage, and automatic refresh for every platform. Your users connect once and stay connected.",
              },
              {
                title: "Unified request format",
                description:
                  "Same JSON structure for posting, feeds, and analytics across all 9 platforms. Learn one API shape, use it everywhere.",
              },
              {
                title: "Media processing",
                description:
                  "Upload images and videos once. We handle format validation, transcoding, and platform-specific requirements automatically.",
              },
              {
                title: "Real-time webhooks",
                description:
                  "Get notified instantly when posts publish, accounts connect, or errors occur. No polling required.",
              },
              {
                title: "SDKs for every stack",
                description:
                  "TypeScript, Python, Go, Ruby, and Kotlin SDKs with type safety and automatic authentication handling.",
              },
              {
                title: "Platform API changes absorbed",
                description:
                  "When platforms update their APIs, we update our integration. Your code stays the same.",
              },
            ].map(({ title, description }) => (
              <div
                key={title}
                className="bg-card border rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-border">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em]">
              Start integrating today
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {`From $10/mo for 1,000 posts. Unlimited social accounts, unlimited
              projects, unlimited team members. Pay only for what you use.`}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="https://app.postforme.dev">
                  Get Started
                  <IconArrowUpRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
