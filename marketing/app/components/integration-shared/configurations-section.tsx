import { IconSend } from "@central-icons/filled";

import { UNIVERSAL_POST_CONFIGS } from "~/lib/data/integrations.universal";

import type { IntegrationData } from "~/lib/.server/data/integrations";

interface ConfigurationsSectionProps {
  integration: IntegrationData;
}

// Reorder so Media and Thumbnail are adjacent
const orderedUniversalConfigs = (() => {
  const configs = [...UNIVERSAL_POST_CONFIGS];
  const mediaIdx = configs.findIndex((c) => c.name === "Media");
  const thumbIdx = configs.findIndex((c) => c.name === "Thumbnail");
  if (mediaIdx >= 0 && thumbIdx >= 0 && thumbIdx !== mediaIdx + 1) {
    const [thumb] = configs.splice(thumbIdx, 1);
    const newMediaIdx = configs.findIndex((c) => c.name === "Media");
    configs.splice(newMediaIdx + 1, 0, thumb);
  }
  return configs;
})();

export const ConfigurationsSection = ({
  integration,
}: ConfigurationsSectionProps) => {
  const hasPlatformConfigs = integration.platformConfigs.length > 0;

  return (
    <div className="py-14">
      <div className="max-w-(--breakpoint-xl) w-full mx-auto px-6">
        {/* Icon above the grid */}
        <div className="flex items-center justify-center size-10 rounded-lg bg-pop/10 mb-6">
          <IconSend className="size-5 text-pop" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Title column */}
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Social media posting
            </h2>
            <p className="text-muted-foreground">
              {`Every integration includes scheduled posting, media processing, and multi-account support out of the box.${hasPlatformConfigs ? ` ${integration.name} adds platform-specific options on top.` : ""}`}
            </p>
          </div>

          {/* Config list columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Universal configs */}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Customize posts
            </p>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
              {orderedUniversalConfigs.map((config) => (
                <div key={config.name}>
                  <p className="font-semibold mb-1">{config.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {config.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Platform-specific configs */}
            {hasPlatformConfigs ? (
              <div className="border-t pt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                  {`Customize specifically for ${integration.name}`}
                </p>
                <div className="grid sm:grid-cols-3 gap-x-6 gap-y-4">
                  {integration.platformConfigs.map((config) => (
                    <div key={config.field}>
                      <p className="text-sm font-semibold mb-0.5">
                        {config.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center">
                    <a
                      href="https://api.postforme.dev/docs"
                      className="text-sm font-semibold text-primary hover:underline underline-offset-2"
                    >
                      {`View all options in the docs →`}
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
