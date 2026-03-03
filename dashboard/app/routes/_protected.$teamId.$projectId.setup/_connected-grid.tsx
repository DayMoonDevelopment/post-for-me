import { Link, useLoaderData } from "react-router";
import {
  CircleFilledIcon,
  TriangleExclamationIcon,
  CircleInfoIcon,
} from "icons";

import { getProviderLabel } from "~/lib/utils";

import { BrandIcon } from "~/components/brand-icon";

import { Badge } from "~/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

import { RedirectUrlCard } from "./_redirect-url-card";

import type { Route } from "./+types/route";

export function ConnectedGrid() {
  const { credentials, isSystem } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  const configuredProviders = Object.entries(credentials || {})
    .filter(([_, creds]) => creds.appId || creds.appSecret || isSystem)
    .sort();

  return (
    <div className="@container grid grid-cols-2 xl:grid-cols-4 gap-4">
      <RedirectUrlCard />

      {configuredProviders.map(([provider, { status }]) => (
        <Link
          to={isSystem ? `system/${provider}` : `${provider}`}
          key={provider}
          className="block"
        >
          <div
            className={
              "flex flex-col items-center text-center gap-3 p-4 bg-card border rounded-lg min-h-[240px]"
            }
          >
            <BrandIcon
              brand={`${provider.split("_")[0]}`}
              className="h-[100px] w-[100px]"
            />

            <h3 className="font-semibold text-base leading-tight">
              {getProviderLabel(provider)}
            </h3>

            {status === "complete" ? (
              <Badge variant="affirmative" size="sm" className="mt-auto">
                <CircleFilledIcon />
                Connected
              </Badge>
            ) : (
              <Badge variant="highlight" size="sm" className="mt-auto">
                <TriangleExclamationIcon />
                Incomplete
              </Badge>
            )}
          </div>
        </Link>
      ))}

      <Link to="bluesky" className="block">
        <div
          className={
            "flex flex-col items-center text-center gap-3 p-4 bg-card border rounded-lg min-h-[240px]"
          }
        >
          <BrandIcon brand="bluesky" className="h-[100px] w-[100px]" />

          <h3 className="font-semibold text-base leading-tight flex items-center justify-center gap-1">
            Bluesky
            <Tooltip>
              <TooltipTrigger>
                <CircleInfoIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>No manual setup required</TooltipContent>
            </Tooltip>
          </h3>

          <Badge variant="affirmative" size="sm" className="mt-auto">
            <CircleFilledIcon />
            Connected
          </Badge>
        </div>
      </Link>
    </div>
  );
}
