import { IconGithub } from "@central-icons/filled";
import { IconArrowUpRight } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import { GitHubStarsBadge } from "~/components/github-stars-badge";
import { Link } from "~/components/link";

import { APP_URL, GITHUB_URL } from "~/lib/constants";

import { Button } from "~/ui/button";

import type { Route } from "../+types/route";

export const FinalCta = () => {
  const { stars } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="px-4 py-16">
      <div className="max-w-(--breakpoint-xl) mx-auto">
        <div className="dark rounded-3xl bg-card text-card-foreground overflow-hidden border p-10 md:p-16 flex flex-col items-center text-center gap-6">
          <IconGithub className="size-10" />

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight max-w-2xl text-balance">
            Star us. Read the code. Ship the thing.
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl text-balance">
            The fastest way to support an open source project is a star. The
            second-fastest is to build something with it.
          </p>

          <div className="mt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button size="lg" className="rounded-full text-base" asChild>
              <Link to={GITHUB_URL} target="_blank">
                <IconGithub className="h-5! w-5!" />
                Star on GitHub
                <IconArrowUpRight className="h-5! w-5!" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full text-base"
              asChild
            >
              <Link to={APP_URL} target="_blank">
                Get Started
              </Link>
            </Button>
          </div>

          <div className="mt-4">
            <GitHubStarsBadge stars={stars} />
          </div>

          <p className="mt-6 text-xs text-muted-foreground max-w-xl">
            The repo is public. You can fork it, self-host it, or just read it.
            Reach out if you do.
          </p>
        </div>
      </div>
    </div>
  );
};
