import { IconCircleCheck, IconCrossSmall } from "@central-icons/outlined";
import { useLoaderData } from "react-router";

import { Badge } from "~/ui/badge";

import type { Route } from "../+types/route";

export const SdkComparison = () => {
  const { comparison } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="bg-background">
      <div className="max-w-(--breakpoint-xl) w-full py-16 px-4 mx-auto">
        <div className="flex flex-col gap-12 max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-[-0.03em] mb-4">
              Developer SDKs & Support
            </h2>
            <p className="text-muted-foreground text-lg">
              Build faster with official SDKs in your favorite languages
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-background">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left p-4 font-semibold">SDK</th>
                  <th className="text-left p-4 font-semibold">
                    <div className="flex items-center gap-2">
                      Post for Me
                      <Badge variant="outline" className="text-xs">Official</Badge>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold">{comparison.competitor.name}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.features.sdks.map((sdk, index) => (
                  <tr key={index} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">{sdk.name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <IconCircleCheck className="size-5 text-green-500" />
                        <span className="text-sm text-muted-foreground">Official SDK</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {sdk.competitorAvailable ? (
                        <div className="flex items-center gap-2">
                          <IconCircleCheck className="size-5 text-green-500" />
                          <span className="text-sm text-muted-foreground">Available</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <IconCrossSmall className="size-5 text-red-500" />
                          <span className="text-sm text-muted-foreground">Not Available</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              All Post for Me SDKs include comprehensive documentation, examples, and TypeScript support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
