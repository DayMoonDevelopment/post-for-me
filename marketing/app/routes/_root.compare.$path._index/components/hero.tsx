import { IconArrowRight, IconArrowUpRight } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import { Link } from "~/components/link";
import { SocialIconsRow } from "~/components/social-icons-row";

import { Button } from "~/ui/button";

import type { Route } from "../+types/route";

export const Hero = () => {
  const { comparison } = useLoaderData<Route.ComponentProps["loaderData"]>();
  const rebrandedAs = comparison.competitor.rebrandedAs;

  return (
    <div className="bg-muted">
      <div className="max-w-(--breakpoint-xl) w-full flex flex-col items-center pt-32 pb-16 px-4 mx-auto">
        <div className="flex flex-col gap-6 max-w-4xl text-center mx-auto">
          {rebrandedAs ? (
            <Link
              to={`/compare/post-for-me-vs-${rebrandedAs.slug}`}
              className="group inline-flex items-center gap-2 self-center rounded-full border border-pop/40 bg-pop/10 px-4 py-1.5 text-sm font-medium text-pop hover:bg-pop/15"
            >
              <span>
                {comparison.competitor.name} is now {rebrandedAs.name} — see the updated comparison
              </span>
              <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : null}
          <SocialIconsRow iconClassName="size-6" className="gap-3 flex-wrap self-center" />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
            Post for Me vs {comparison.competitor.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 text-balance">
            Why developers are choosing Post for Me over {comparison.competitor.name} for powering social media posting and analytics in their apps.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
  );
};
