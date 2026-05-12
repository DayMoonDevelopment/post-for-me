import { useLoaderData } from "react-router";

import { FeedsAnalytics } from "~/components/integration-shared/feeds-analytics";

import type { Route } from "../+types/route";

export const FeedsAnalyticsSection = () => {
  const { integration } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return <FeedsAnalytics integration={integration} />;
};
