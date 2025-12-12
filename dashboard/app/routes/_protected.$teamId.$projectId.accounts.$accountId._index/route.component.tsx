import { useLoaderData } from "react-router";
import { AccountFeedDataTable } from "./_data-table";
import { Badge } from "~/ui/badge";

import type { loader } from "./route.loader";

const providerColors = {
  facebook: "bg-blue-500",
  instagram: "bg-pink-500",
  x: "bg-black",
  tiktok: "bg-black",
  youtube: "bg-red-600",
  pinterest: "bg-red-400",
  linkedin: "bg-blue-700",
  bluesky: "bg-sky-500",
  threads: "bg-purple-500",
} as const;

export function Component() {
  const { accountInfo } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="px-1">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">Account Feed</h2>
            {accountInfo ? (
              <Badge
                className={`${
                  providerColors[
                    accountInfo.provider as keyof typeof providerColors
                  ]
                } text-white`}
              >
                {accountInfo.provider}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {accountInfo?.username
              ? `Posts from @${accountInfo.username}`
              : "View posts and metrics from this social account"}
          </p>
        </div>

        {accountInfo ? (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Account ID</div>
            <div className="font-mono text-xs">{accountInfo.id}</div>
          </div>
        ) : null}
      </div>

      <AccountFeedDataTable />
    </div>
  );
}
