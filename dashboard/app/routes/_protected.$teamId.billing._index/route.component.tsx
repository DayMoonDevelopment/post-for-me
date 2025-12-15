import { useState } from "react";
import { Form, Link, useLoaderData } from "react-router";
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
import { UpgradeConfirmationDialog } from "./_upgrade-confirmation-dialog";

import type { loader } from "./route.loader";

export function Component() {
  const {
    team,
    subscription,
    hasActiveSubscription,
    hasCredsAddon,
    portalUrl,
    hasCredsAccess,
    upcomingInvoice,
    planInfo,
    isLegacyPlan,
    pricingTiers,
  } = useLoaderData<typeof loader>();

  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
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

      {/* Only show subscription status card if there is an active subscription */}
      {hasActiveSubscription ? (
        <div className={`gap-6 ${isLegacyPlan ? "grid md:grid-cols-2" : ""}`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Subscription Status
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800"
                >
                  <CheckmarkSmallIcon className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </CardTitle>
              <CardDescription>
                Your subscription is active and ready to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize">{subscription?.status}</span>
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

              <div className="pt-2">
                {portalUrl ? (
                  <Button asChild className="w-full">
                    <a href={portalUrl}>Manage Subscription</a>
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
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddonDialog(true)}
                  >
                    {hasCredsAddon
                      ? "Disable System Credentials"
                      : "Enable System Credentials"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* Show pricing tiers for legacy plans or no subscription */}
      {(isLegacyPlan || !hasActiveSubscription) &&
      pricingTiers.length > 0 &&
      selectedTier ? (
        <>
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Pro</CardTitle>
              </div>
              <div className="flex flex-row gap-4">
                <div className="text-3xl font-bold">
                  ${selectedTier.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </div>

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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    {selectedTier.posts.toLocaleString()} posts per month
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Unlimited social accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Read social account feeds</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Analytics for social posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    Bring your own social media developer credentials
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">
                    Use our social media developer credentials
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Unlimited API Keys</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckmarkSmallIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Unlimited team members</span>
                </div>
              </div>

              <div className="pt-4">
                {isLegacyPlan ? (
                  <Button
                    className="w-full"
                    onClick={() => setShowUpgradeDialog(true)}
                  >
                    Upgrade Plan
                  </Button>
                ) : portalUrl ? (
                  <Button className="w-full" asChild>
                    <a href={portalUrl}>Select Plan</a>
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
          <Card className="shadow-none bg-muted">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Need more support or higher usage?
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Contact us for a tailored plan to meet higher enterprise-level
                needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-row gap-2">
              <Button asChild>
                <Link
                  to="https://cal.com/team/day-moon/post-for-me-enterprise-plan-inquiry"
                  target="_blank"
                >
                  Get in Touch
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
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

      <UpgradeConfirmationDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        tierIndex={selectedTierIndex}
        tierPosts={selectedTier?.posts || 0}
        tierPrice={selectedTier?.price || 0}
      />
    </div>
  );
}
