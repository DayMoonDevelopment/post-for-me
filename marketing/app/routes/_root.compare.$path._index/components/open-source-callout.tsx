import { IconGithub, IconUnlocked } from "@central-icons/filled";
import { IconArrowUpRight } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import { Link } from "~/components/link";

import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";

import type { Route } from "../+types/route";

export const OpenSourceCallout = () => {
  const { comparison } = useLoaderData<Route.ComponentProps["loaderData"]>();
  const competitorName = comparison.competitor.name;

  return (
    <div className="bg-background">
      <div className="max-w-(--breakpoint-xl) w-full py-12 px-4 mx-auto">
        <div className="max-w-4xl mx-auto rounded-2xl border bg-muted/30 p-8 md:p-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-background border shrink-0">
            <IconUnlocked className="size-7 text-pop" />
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <Badge variant="outline" className="self-start">
              Open Source
            </Badge>
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight">
              {`Post for Me is built in the open. ${competitorName} isn't.`}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Read every line of code that handles your tokens. Watch the
              roadmap in public. Open an issue for the feature you need.
            </p>
          </div>

          <div className="flex-shrink-0">
            <Button asChild>
              <Link to="/open-source-social-media-api">
                <IconGithub className="size-4" />
                How we build in the open
                <IconArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
