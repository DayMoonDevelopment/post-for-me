import { useLoaderData, Link, useParams } from "react-router";
import { AccountFeedDataTable } from "./_data-table";
import { Button } from "~/ui/button";
import { ArrowRightIcon } from "icons";
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
  const data = useLoaderData<typeof loader>();
  const params = useParams();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/${params.teamId}/${params.projectId}/accounts`}>
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
            <span>Back to Accounts</span>
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="px-1">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">Account Feed</h2>
            {data.accountInfo ? (
              <Badge
                className={`${
                  providerColors[
                    data.accountInfo.provider as keyof typeof providerColors
                  ]
                } text-white`}
              >
                {data.accountInfo.provider}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {data.accountInfo?.username
              ? `Posts from @${data.accountInfo.username}`
              : "View posts and metrics from this social account"}
          </p>
        </div>

        {data.accountInfo ? (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Account ID</div>
            <div className="font-mono text-xs">{data.accountInfo.id}</div>
          </div>
        ) : null}
      </div>

      <AccountFeedDataTable data={data} />
    </div>
  );
}
