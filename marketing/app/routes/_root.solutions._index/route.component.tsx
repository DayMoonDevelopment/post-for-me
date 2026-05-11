import {
  IconCalendarClock,
  IconRobot,
  IconCelebrate,
  IconGamepad,
  IconDevices,
  IconShipping,
  IconTrending1,
  IconPeople,
  IconFolder1,
  IconNotes,
  IconTicket,
} from "@central-icons/outlined";
import { Link, useLoaderData } from "react-router";

import { cn } from "~/lib/utils";

import type { Route } from "./+types/route";

// Map solution IDs to icons
const solutionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "social-media-scheduler": IconCalendarClock,
  "ai-content-generation": IconRobot,
  "multi-account-management": IconCelebrate,
  games: IconGamepad,
  "saas-products": IconDevices,
  "e-commerce-platforms": IconShipping,
  "influencer-management": IconTrending1,
  "crm-systems": IconPeople,
  "dam-tools": IconFolder1,
  "news-media-publishers": IconNotes,
  "event-management": IconTicket,
};

export function Component() {
  const { solutions } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="flex flex-col pt-16">
      {/* Hero Section */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em]">
            Solutions for every developer
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
            From social media schedulers to AI tools, games to enterprise platforms—see how developers use Post for Me to build social features without the infrastructure overhead.
          </p>
        </div>
      </div>

      {/* Solutions Grid */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((solution) => {
            const Icon = solutionIcons[solution.id] || IconDevices;

            return (
              <Link
                key={solution.id}
                to={`/solutions/${solution.id}`}
                className={cn(
                  "group relative flex flex-col p-6 rounded-lg border border-border",
                  "bg-card hover:bg-accent/50 transition-colors duration-200",
                  "hover:border-primary/50"
                )}
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {solution.nav.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {solution.nav.description}
                </p>

                {/* Arrow indicator */}
                <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more
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

      {/* CTA Section */}
      <div className="border-t border-border">
        <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em]">
              Don&apos;t see your use case?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Post for Me&apos;s unified API works for any product that needs social media features. Get in touch to discuss your specific needs.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Contact us
              </Link>
              <Link
                to="/developers"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-border font-medium hover:bg-accent transition-colors"
              >
                View documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
