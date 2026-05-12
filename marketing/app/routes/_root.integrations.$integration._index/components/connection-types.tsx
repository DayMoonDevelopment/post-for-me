import { IconShieldCheck } from "@central-icons/filled";
import { IconCircleInfo } from "@central-icons/outlined";
import { useRouteLoaderData } from "react-router";

import { Badge } from "~/ui/badge";

import type { loader } from "~/routes/_root.integrations.$integration/route.loader";

export const ConnectionTypes = () => {
  const data = useRouteLoaderData<typeof loader>(
    "routes/_root.integrations.$integration",
  );
  const integration = data?.integration;

  if (!integration) return null;

  return (
    <div className="flex items-center justify-center py-14">
      <div className="max-w-(--breakpoint-xl) w-full px-6">
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center max-w-3xl text-balance mx-auto mb-4">
          {integration.connectionTypes.length > 1
            ? "Choose how users connect"
            : "Simple, secure authentication"}
        </h2>
        <p className="text-lg text-muted-foreground text-center text-balance max-w-2xl mx-auto mb-10">
          {integration.connectionTypes.length > 1
            ? `${integration.name} supports ${integration.connectionTypes.length} connection methods. Pick the one that fits your product, or offer both.`
            : `Connect ${integration.name} accounts with ${integration.connectionTypes[0].authMethod}. Post for Me handles the entire auth flow and token management.`}
        </p>

        <div
          className={`max-w-(--breakpoint-lg) grid gap-8 mx-auto ${
            integration.connectionTypes.length > 1 ? "md:grid-cols-2" : "max-w-xl"
          }`}
        >
          {integration.connectionTypes.map((ct) => (
            <div
              key={ct.name}
              className="flex flex-col border rounded-xl p-8 bg-card"
            >
              <div className="flex flex-row gap-3 items-center mb-4">
                <div className="flex items-center justify-center size-10 bg-muted rounded-full">
                  <IconShieldCheck className="size-5 text-pop" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{ct.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {ct.authMethod}
                  </Badge>
                </div>
              </div>

              <p className="text-muted-foreground mb-4">{ct.description}</p>

              {ct.scopes && ct.scopes.length > 0 ? <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2">OAuth Scopes</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {ct.scopes.map((scope) => (
                      <code
                        key={scope}
                        className="text-xs bg-muted px-2 py-1 rounded font-mono"
                      >
                        {scope}
                      </code>
                    ))}
                  </div>
                </div> : null}

              {ct.notes ? <div className="flex items-start gap-2 mt-auto pt-4 border-t">
                  <IconCircleInfo className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{ct.notes}</p>
                </div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
