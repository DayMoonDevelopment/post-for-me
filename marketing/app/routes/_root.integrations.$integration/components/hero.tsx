import { useLoaderData } from "react-router";

import { HeroSection } from "~/components/integration-shared/hero-section";

import type { Route } from "../+types/route";

export const Hero = () => {
  const { integration } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return <HeroSection integration={integration} />;
};
