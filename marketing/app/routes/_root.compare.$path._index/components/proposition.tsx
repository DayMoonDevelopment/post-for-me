import { IconArrowUpRight, IconExclamationTriangle } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import { Link } from "~/components/link";

import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { Button } from "~/ui/button";

import type { Route } from "../+types/route";

export const Proposition = () => {
  const { comparison } = useLoaderData<Route.ComponentProps["loaderData"]>();

  if (!comparison.proposition) {
    return null;
  }

  const { title, description } = comparison.proposition;

  return (
    <div className="bg-muted/30">
      <div className="max-w-(--breakpoint-xl) w-full py-16 px-4 mx-auto">
        <div className="flex flex-col gap-12 max-w-4xl mx-auto">
          <Alert variant="pop" className="p-8">
            <IconExclamationTriangle className="mt-1" />
            <AlertTitle className="text-xl font-semibold">
              {title}
            </AlertTitle>
            <AlertDescription className="text-base leading-relaxed">
              {description}
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <Button asChild size="lg">
              <Link to="https://app.postforme.dev">
                Start Building with Post for Me
                <IconArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
