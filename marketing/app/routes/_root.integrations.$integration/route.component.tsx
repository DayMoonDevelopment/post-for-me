import { useLoaderData } from "react-router";
import { Outlet } from "react-router";

import { FAQSectionWrapper } from "~/components/integration-shared/faq-section-wrapper";
import { UseCasesSection } from "~/components/integration-shared/use-cases-section";
import { SetupOptionsSection as SetupOptions } from "~/components/setup-options-section";

import { ConfigurationsSection } from "./components/configurations-section";
import { FeedsAnalyticsSection } from "./components/feeds-analytics-section";
import { Hero } from "./components/hero";
import { Pricing } from "./components/pricing";

import type { Route } from "./+types/route";

export function Component() {
  const { integration, faq } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="flex flex-col pt-16">
      <Hero />
      <ConfigurationsSection />
      <FeedsAnalyticsSection />
      <Outlet />
      <UseCasesSection
        platformName={integration.name}
        useCases={integration.useCases}
      />
      <SetupOptions />
      <Pricing />
      <FAQSectionWrapper faq={faq} />
    </div>
  );
}
