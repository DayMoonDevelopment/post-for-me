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
        >
          <div
            className={
              "flex flex-row items-center justify-between p-3 bg-card border rounded-lg"
            }
          >
            <h3 className="font-semibold text-sm flex flex-row items-center gap-1">
              <BrandIcon
                brand={`${provider.split("_")[0]}`}
                className="size-3.5"
              />
              {getProviderLabel(provider)}
            </h3>

            {status === "complete" ? (
              <Badge variant="affirmative" size="sm">
                <CircleFilledIcon />
                Connected
              </Badge>
            ) : (
              <Badge variant="informative" size="sm">
                <TriangleExclamationIcon />
                Incomplete
              </Badge>
            )}
          </div>
        </Link>
      ))}

      <Link to="bluesky">
        <div
          className={
            "flex flex-row items-center justify-between p-3 bg-card border rounded-lg"
          }
        >
          <div>
            <h3 className="font-semibold text-sm flex flex-row items-center gap-1">
              <BrandIcon brand="bluesky" className="size-3.5" />
              Bluesky
              <Tooltip>
                <TooltipTrigger>
                  <CircleInfoIcon className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>No manual setup required</TooltipContent>
              </Tooltip>
            </h3>
          </div>

          <Badge variant="affirmative" size="sm">
            <CircleFilledIcon />
            Connected
          </Badge>
        </div>
      </Link>
    </div>
  );
}
