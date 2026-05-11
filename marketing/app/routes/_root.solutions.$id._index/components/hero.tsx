import { IconArrowUpRight } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import { Link } from "~/components/link";
import { SocialIconsRow } from "~/components/social-icons-row";

import { Button } from "~/ui/button";

import type { Route } from "../+types/route";

export const Hero = () => {
  const { solution } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="bg-muted">
      <div className="max-w-(--breakpoint-xl) w-full flex flex-col md:flex-row gap-12 lg:gap-16 items-start py-16 px-4 mx-auto">
        {/* Left side: Title and CTAs */}
        <div className="flex flex-col gap-6 flex-1 lg:flex-2">
          <SocialIconsRow iconClassName="size-6" className="gap-3 flex-wrap" />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em]">
            {solution.hero.headline}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            {solution.hero.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
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

        {/* Right side: Description and social icons */}
        <div className="flex flex-col gap-6 pt-4 flex-1">
          <div className={"w-full aspect-square overflow-hidden"}>
            <img
              src={`/solutions/${solution.id}-light.png`}
              alt="Feature Image"
              className="w-full h-full object-cover dark:hidden"
            />

            <img
              src={`/solutions/${solution.id}-dark.png`}
              alt="Feature Image"
              className="w-full h-full object-cover hidden dark:block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
