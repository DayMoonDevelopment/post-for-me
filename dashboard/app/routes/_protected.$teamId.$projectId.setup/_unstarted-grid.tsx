import { Link, useLoaderData } from "react-router";

import { getProviderLabel } from "~/lib/utils";

import { BrandIcon } from "~/components/brand-icon";

import { Button } from "~/ui/button";

import type { Route } from "./+types/route";
import { useForm } from "~/hooks/use-form";

const allPlatforms = [
  "facebook",
  "instagram",
  "instagram_w_facebook",
  "youtube",
  "x",
  "pinterest",
  "linkedin",
  "threads",
  "tiktok",
  "tiktok_business",
] as const;

export function UnstartedGrid() {
  const { credentials, isSystem } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  const { Form: EnableCredsForm, isSubmitting } = useForm();

  const unstartedProviders = allPlatforms.filter((platform) => {
    const creds = credentials?.[platform];
    return !creds || (!creds.appId && !creds.appSecret && !isSystem);
  });

  if (unstartedProviders.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <h3 className="col-span-full text-xl font-semibold">Get Started</h3>
      {unstartedProviders.map((provider) => (
        <div
          key={`${provider}`}
          className={"flex flex-col gap-4 p-3 bg-card border rounded-lg"}
        >
          <h3 className="text-lg font-semibold flex flex-row items-center gap-1.5">
            <BrandIcon brand={`${provider.split("_")[0]}`} className="size-5" />
            {getProviderLabel(provider)}
          </h3>

          {isSystem ? (
            <EnableCredsForm
              method="post"
              action={`system/${provider}`}
              className="self-end"
            >
              <Button disabled={isSubmitting}>Enable</Button>
            </EnableCredsForm>
          ) : (
            <Link to={`${provider}`} className="self-end">
              <Button>Get Started</Button>
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
