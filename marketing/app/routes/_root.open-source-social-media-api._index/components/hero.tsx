import { IconArrowUpRight } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import { GitHubStarsBadge } from "~/components/github-stars-badge";
import { Link } from "~/components/link";

import { APP_URL } from "~/lib/constants";

import { Button } from "~/ui/button";

import type { Route } from "../+types/route";

export const Hero = () => {
  const { stars } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="relative flex items-center justify-center px-6 pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
      {/* Decorative dot grid background. Placeholder visual. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
      />

      <div className="relative z-10 text-center max-w-4xl mx-auto flex flex-col items-center">
        <GitHubStarsBadge stars={stars} />

        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl md:leading-[1.1] font-semibold tracking-tighter text-balance">
          The best social media API{" "}
          <span className="text-pop">and open source</span>
        </h1>

        <p className="mt-6 md:text-lg lg:text-xl text-muted-foreground text-balance max-w-2xl">
          Post to 9 platforms through one API. Every commit, every issue, every
          roadmap decision happens in public, so you can trust the code your
          product runs on.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" className="rounded-full text-base" asChild>
            <Link to={APP_URL} target="_blank">
              Get Started
              <IconArrowUpRight className="h-5! w-5!" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full text-base"
            asChild
          >
            <Link to="#build-in-public">Follow along</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
