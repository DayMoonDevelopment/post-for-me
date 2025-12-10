import { useState } from "react";
import { Form, useLoaderData } from "react-router";
import { CheckmarkSmallIcon, CrossSmallIcon } from "icons";

import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select";

import { AddonConfirmationDialog } from "./_addon-confirmation-dialog";

import type { loader } from "./route.loader";

export function Component() {
  const {
    team,
    subscription,
    hasActiveSubscription,
    hasCredsAddon,
    portalUrl,
    checkoutUrl,
    hasCredsAccess,
    upcomingInvoice,
    planInfo,
    isLegacyPlan,
    pricingTiers,
  } = useLoaderData<typeof loader>();

  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);

  const selectedTier = pricingTiers[selectedTierIndex];

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing settings for {team.name}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Subscription Status
              {hasActiveSubscription ? (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800"
                >
                  <CheckmarkSmallIcon className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  <CrossSmallIcon className="w-3 h-3 mr-1" />
                  Inactive
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {hasActiveSubscription
                ? "Your subscription is active and ready to use"
                : "Set up billing to start using the platform"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && hasActiveSubscription ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize">{subscription.status}</span>
                </div>

                {planInfo ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plan:</span>
                      <span>
                        {planInfo.planName}
                        {isLegacyPlan ? (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Legacy
                          </Badge>
                        ) : null}
                      </span>
                    </div>
                    {planInfo.postLimit ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Post Limit:
                        </span>
                        <span>{planInfo.postLimit.toLocaleString()} posts</span>
                      </div>
                    ) : null}
                    {planInfo.includesSystemCredentials ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          System Credentials:
                        </span>
                        <span className="text-green-600">Included</span>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Billing email:</span>
                  <span>{team.billing_email || "Not set"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active subscription found. Set up billing to get started.
              </p>
            )}

            <div className="pt-2">
              {hasActiveSubscription && portalUrl ? (
                <Button asChild className="w-full">
                  <a href={portalUrl}>Manage Subscription</a>
                </Button>
              ) : checkoutUrl ? (
                <Button asChild className="w-full">
                  <a href={checkoutUrl}>Set Up Billing</a>
                </Button>
              ) : (
                <Button disabled className="w-full">
                  Unable to load billing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Only show addon card for legacy plans */}
        {isLegacyPlan ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                System Credentials Addon
                {hasCredsAddon ? (
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    <CheckmarkSmallIcon className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <CrossSmallIcon className="w-3 h-3 mr-1" />
                    {hasCredsAccess ? "Removed" : "Not enabled"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Use our managed social media credentials for posting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {hasCredsAddon
                    ? "You can create system projects that use our managed credentials for social media platforms."
                    : hasCredsAccess
                      ? "You can create system projects that use our managed credentials for social media platforms, for the remainder of your subscription term"
                      : "Enable this addon for $10/month to create system projects without managing your own API credentials."}
                </p>
                {subscription && hasActiveSubscription ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="capitalize">
                      {hasCredsAddon
                        ? "Active"
                        : hasCredsAccess
                          ? "Removed"
                          : "Inactive"}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="pt-2 space-y-2">
                {hasActiveSubscription ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAddonDialog(true)}
                    >
                      {hasCredsAddon
                        ? "Disable System Credentials"
                        : "Enable System Credentials"}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    Requires active subscription
                  </Button>
              )}
            </div>
          </CardContent>
        </Card>
        ) : null}
      </div>

      {/* Show pricing tiers for legacy plans or no subscription */}
      {(isLegacyPlan || !hasActiveSubscription) &&
      pricingTiers.length > 0 &&
      selectedTier ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {isLegacyPlan ? "Upgrade to New Pricing" : "Available Plans"}
            </CardTitle>
            <CardDescription>
              {isLegacyPlan
                ? "Switch to our new prepaid pricing model with included system credentials"
                : "Choose a plan that fits your needs"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">
                  How many posts do you need?
                </label>
                <Select
                  value={selectedTierIndex.toString()}
                  onValueChange={(value) =>
                    setSelectedTierIndex(parseInt(value))
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingTiers.map((tier, index) => (
                      <SelectItem key={tier.productId} value={index.toString()}>
                        {tier.posts.toLocaleString()} posts
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">
                      {selectedTier.name}
                    </CardTitle>
                    <div className="text-3xl font-bold">
                      ${selectedTier.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /one-time
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm">
                        {selectedTier.posts.toLocaleString()} posts included
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm">
                        System credentials included
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm">
                        ${(selectedTier.price / selectedTier.posts).toFixed(3)}{" "}
                        per post
                      </span>
                    </div>
                  </div>

                  <div className="pt-4">
                    {portalUrl ? (
                      <Button className="w-full" asChild>
                        <a href={portalUrl}>
                          {isLegacyPlan ? "Upgrade Plan" : "Select Plan"}
                        </a>
                      </Button>
                    ) : (
                      <Form method="post">
                        <input
                          type="hidden"
                          name="action"
                          value="create_checkout"
                        />
                        <input
                          type="hidden"
                          name="tierIndex"
                          value={selectedTierIndex}
                        />
                        <Button type="submit" className="w-full">
                          Get Started
                        </Button>
                      </Form>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {upcomingInvoice && hasActiveSubscription ? (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Invoice</CardTitle>
            <CardDescription>
              Your next billing charge scheduled for{" "}
              {new Date(upcomingInvoice.created * 1000).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {upcomingInvoice.lines.data.map((line, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {line.description}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    ${(line.amount / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-semibold">
                <span>Total</span>
                <span>${(upcomingInvoice.total / 100).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <AddonConfirmationDialog
        isOpen={showAddonDialog}
        onClose={() => setShowAddonDialog(false)}
        hasAddon={hasCredsAddon}
      />
    </div>
  );
}
