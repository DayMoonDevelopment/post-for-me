import { IconArrowRight } from "@central-icons/outlined";
import { Link, useLoaderData } from "react-router";

import { Button } from "~/ui/button";

import type { Route } from './+types/route'

export function Component() {
  const data = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Compare Post for Me
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          See how Post for Me stacks up against other social media API solutions.
          Find the right tool for your development needs.
        </p>
      </div>

      <div className="flex flex-col gap-0 w-full max-w-lg mx-auto">
        {Object.entries(data.comparisons).map(([slug, comparison]) => (
          <Link
            key={slug}
            to={`/compare/${slug}`}
          >
            <div className="group flex flex-row items-center justify-between transition-all border-b hover:border-primary py-4">
              <h2>{comparison.competitor.name}</h2>
              <IconArrowRight className="size-4 group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-muted-foreground mb-4">
          {`Don't see the tool you're looking for?`}
        </p>
        <Button asChild variant="outline">
          <Link
            to="https://github.com/DayMoonDevelopment/post-for-me-marketing/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Request a comparison
            <IconArrowRight  />
          </Link>
        </Button>
      </div>
    </div>
  );
}
