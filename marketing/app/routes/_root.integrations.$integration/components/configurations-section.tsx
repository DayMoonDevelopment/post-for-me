import { useLoaderData } from "react-router";

import { ConfigurationsSection as SharedConfigurationsSection } from "~/components/integration-shared/configurations-section";

import type { Route } from "../+types/route";

export const ConfigurationsSection = () => {
  const { integration } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return <SharedConfigurationsSection integration={integration} />;
};
