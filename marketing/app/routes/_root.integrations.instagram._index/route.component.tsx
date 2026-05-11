import { useLoaderData } from "react-router";

import { ConfigurationsSection } from "~/components/integration-shared/configurations-section";
import { FAQSectionWrapper } from "~/components/integration-shared/faq-section-wrapper";
import { FeedsAnalytics } from "~/components/integration-shared/feeds-analytics";
import { HeroSection } from "~/components/integration-shared/hero-section";
import { UseCasesSection } from "~/components/integration-shared/use-cases-section";
import { SetupOptionsSection as SetupOptions } from "~/components/setup-options-section";

import { Pricing } from "~/routes/_root.integrations.$integration/components/pricing";

import type { loader } from "./route.loader";

export function Component() {
  const { integration, faq } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col pt-16">
      <HeroSection integration={integration} />
      <ConfigurationsSection integration={integration} />
      <FeedsAnalytics integration={integration} />

      {/* Instagram-specific: Dual connection method */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-14">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-4">
          Two ways to connect Instagram
        </h2>
        <p className="text-lg text-muted-foreground text-center text-balance max-w-2xl mx-auto mb-10">
          {`Both methods give access to the same publishing features. The only difference is the login flow your users experience.`}
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {integration.connectionTypes.map((ct) => (
            <div
              key={ct.name}
              className="flex flex-col border rounded-xl p-8 bg-card"
            >
              <h3 className="text-xl font-semibold mb-4">{ct.name}</h3>
              <p className="text-muted-foreground">{ct.description}</p>
            </div>
          ))}
        </div>
      </div>

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
