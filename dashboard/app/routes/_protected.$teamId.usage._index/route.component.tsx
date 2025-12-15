import { Link, useLoaderData } from "react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/card";
import { Button } from "~/ui/button";

import type { loader } from "./route.loader";

export function Component() {
  const { team, usage, subscriptionPeriod, hasStripeCustomer, planInfo } =
    useLoaderData<typeof loader>();

  // Calculate usage percentage and determine color
  const getUsageColor = () => {
    if (!planInfo?.postLimit || usage === null) return "";

    const usagePercentage = (usage / planInfo.postLimit) * 100;

    if (usagePercentage >= 100) {
      return "text-red-600"; // Over limit
    } else if (usagePercentage >= 80) {
      return "text-yellow-600"; // Close to limit (warning)
    }
    return ""; // Normal
  };

  const usageColor = getUsageColor();

  // Determine if we should show the upgrade warning
  const shouldShowUpgradeWarning = () => {
    if (!planInfo?.postLimit || usage === null) return false;
    const usagePercentage = (usage / planInfo.postLimit) * 100;
    return usagePercentage >= 80; // Show warning at 80% or more
  };

  const getWarningMessage = () => {
    if (!planInfo?.postLimit || usage === null)
      return { title: "", description: "" };
    const usagePercentage = (usage / planInfo.postLimit) * 100;

    if (usagePercentage >= 100) {
      return {
        title: "Usage Limit Exceeded",
        description:
          "You've exceeded your plan's post limit. Upgrade to continue posting without interruption.",
      };
    } else if (usagePercentage >= 80) {
      return {
        title: "Approaching Usage Limit",
        description: `You've used ${Math.round(usagePercentage)}% of your plan's post limit. Consider upgrading to avoid hitting your limit.`,
      };
    }
    return { title: "", description: "" };
  };

  const showWarning = shouldShowUpgradeWarning();
  const warningMessage = getWarningMessage();

  // Determine if usage has exceeded the limit
  const isLimitExceeded = () => {
    if (!planInfo?.postLimit || usage === null) return false;
    const usagePercentage = (usage / planInfo.postLimit) * 100;
    return usagePercentage >= 100;
  };

  const limitExceeded = isLimitExceeded();

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="text-muted-foreground">
          View your current usage for {team.name}
        </p>
      </div>

      {showWarning ? (
        <Card
          className={
            limitExceeded
              ? "border-red-600 bg-red-50 dark:bg-red-950/20"
              : "border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20"
          }
        >
          <CardHeader>
            <CardTitle
              className={
                limitExceeded
                  ? "text-red-900 dark:text-red-100"
                  : "text-yellow-900 dark:text-yellow-100"
              }
            >
              {warningMessage.title}
            </CardTitle>
            <CardDescription
              className={
                limitExceeded
                  ? "text-red-800 dark:text-red-200"
                  : "text-yellow-800 dark:text-yellow-200"
              }
            >
              {warningMessage.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={`/${team.id}/billing`}>Upgrade Plan</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
                <span className={`font-bold ${usageColor}`}>
                  {usage.toLocaleString()}
                </span>
                <span className={usageColor}>
                  {" "}
                  {planInfo?.postLimit
                    ? ` / ${planInfo.postLimit.toLocaleString()}`
                    : ""}{" "}
                  posts
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
