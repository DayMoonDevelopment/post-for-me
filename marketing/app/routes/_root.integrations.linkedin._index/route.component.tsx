import { IconPeople, IconBuildings } from "@central-icons/filled";
import { useLoaderData } from "react-router";

import { ConfigurationsSection } from "~/components/integration-shared/configurations-section";
import { FAQSectionWrapper } from "~/components/integration-shared/faq-section-wrapper";
import { FeedsAnalytics } from "~/components/integration-shared/feeds-analytics";
import { HeroSection } from "~/components/integration-shared/hero-section";
import { UseCasesSection } from "~/components/integration-shared/use-cases-section";
import { SetupOptionsSection as SetupOptions } from "~/components/setup-options-section";

import { Pricing } from "~/routes/_root.integrations.$integration/components/pricing";

import type { loader } from "./route.loader";

const connectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Personal Profile": IconPeople,
  "Organization Page": IconBuildings,
};

export function Component() {
  const { integration, faq } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col pt-16">
      <HeroSection integration={integration} />
      <ConfigurationsSection integration={integration} />
      <FeedsAnalytics integration={integration} />

      {/* LinkedIn-specific: Personal vs Organization */}
      <div className="max-w-(--breakpoint-lg) w-full mx-auto px-6 py-14">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center mb-4">
          Personal profiles and company pages
        </h2>
        <p className="text-lg text-muted-foreground text-center text-balance max-w-2xl mx-auto mb-10">
          Publish to individual LinkedIn profiles or Organization (Company)
          Pages with the same API.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {integration.connectionTypes.map((ct) => (
            <div
              key={ct.name}
              className="flex flex-col border rounded-xl p-8 bg-card"
            >
              <div className="flex items-center gap-3 mb-4">
                {connectionIcons[ct.name] ? (() => {
                  const Icon = connectionIcons[ct.name];
                  return (
                    <div className="flex items-center justify-center size-10 rounded-xl bg-pop/10">
                      <Icon className="size-5 text-pop" />
                    </div>
                  );
                })() : null}
                <h3 className="text-xl font-semibold">{ct.name}</h3>
              </div>
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
