import { useLoaderData } from "react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/card";

import type { loader } from "./route.loader";

export function Component() {
  const { team, usage, subscriptionPeriod, hasStripeCustomer } =
    useLoaderData<typeof loader>();

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="text-muted-foreground">
          View your current usage for {team.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Subscription Usage</CardTitle>
          <CardDescription>
            {subscriptionPeriod
              ? `Usage from ${subscriptionPeriod.start.toLocaleDateString()} to ${subscriptionPeriod.end.toLocaleDateString()}`
              : "No active subscription period"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasStripeCustomer ? (
            <div className="text-sm text-muted-foreground">
              No Stripe customer found for this team. Please set up billing to
              track usage.
            </div>
          ) : usage !== null ? (
            <div className="space-y-2">
              <div className="justify-between items-center">
                <span className="text-muted-foreground">Total Usage:</span>{" "}
                <span className="font-bold">
                  {usage.toLocaleString()} posts
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Unable to load usage data. Please try again later.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
