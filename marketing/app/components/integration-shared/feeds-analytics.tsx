import { IconNewspaper, IconChart1 } from "@central-icons/filled";

import type { IntegrationData } from "~/lib/.server/data/integrations";

interface FeedsAnalyticsProps {
  integration: IntegrationData;
}

export const FeedsAnalytics = ({ integration }: FeedsAnalyticsProps) => {
  return (
    <div className="bg-muted">
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Title column */}
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Feeds and analytics
            </h2>
            <p className="text-muted-foreground">
              {`Read published content and pull performance data from ${integration.name} through the same unified API.`}
            </p>
          </div>

          {/* Feeds */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-pop/10 shrink-0">
              <IconNewspaper className="size-5 text-pop" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">
                {integration.capabilities.feeds.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {integration.capabilities.feeds.description}
              </p>
            </div>
          </div>

          {/* Analytics */}
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-pop/10 shrink-0">
              <IconChart1 className="size-5 text-pop" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">
                {integration.capabilities.analytics.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {integration.capabilities.analytics.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
