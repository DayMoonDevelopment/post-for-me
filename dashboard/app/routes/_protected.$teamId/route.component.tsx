import { Link, Outlet, useLoaderData, useParams } from "react-router";

import { TriangleExclamationIcon } from "~/components/icons";

import { OnboardingProvider } from "~/components/onboarding-provider";
import { PostHogIdentifier } from "~/tracking/posthog-identifier";

import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { SidebarInset, SidebarProvider } from "~/ui/sidebar";
import { Button } from "~/ui/button";

import { AppSidebar } from "./_app-sidebar";
import { Header } from "./_header";

import type { Route } from "./+types/route";

/**
 * Renders the revocation deadline in the viewer's locale. Deliberately a date
 * rather than a countdown: the grace window is measured in days, so "in 2 days"
 * reads as vaguer than the date it actually happens on.
 */
function formatGraceDeadline(deadline: string, expired: boolean) {
  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return "Update your payment method to keep API access.";
  }

  const formatted = date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  return expired
    ? `API access ended ${formatted}.`
    : `API access ends ${formatted}.`;
}

export function Component() {
  const { teamId } = useParams();
  const { billing } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <OnboardingProvider>
      <PostHogIdentifier />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />

          <div className="@container/main">
            {billing.grace ? (
              <div className="p-4">
                <Alert variant="highlight" className="@container">
                  <TriangleExclamationIcon />

                  <div className="flex flex-col gap-4 @md:flex-row @md:items-start @md:justify-between">
                    <div>
                      <AlertTitle>
                        Your last payment failed.{" "}
                        {formatGraceDeadline(
                          billing.grace.deadline,
                          billing.grace.expired,
                        )}
                      </AlertTitle>
                      <AlertDescription>
                        {billing.grace.expired
                          ? "Your grace period is over and your API keys are being revoked. Update your payment method to restore access."
                          : "Your API keys are still working. Update your payment method to keep them that way."}
                      </AlertDescription>
                    </div>

                    <Button asChild className="self-center">
                      <Link to={`/${teamId}/billing`} prefetch="render">
                        Update payment
                      </Link>
                    </Button>
                  </div>
                </Alert>
              </div>
            ) : null}

            {billing.active ? null : (
              <div className="p-4">
                <Alert variant="highlight" className="@container">
                  <TriangleExclamationIcon />

                  <div className="flex flex-col gap-4 @md:flex-row @md:items-start @md:justify-between">
                    <div>
                      <AlertTitle>Set up billing to get started.</AlertTitle>
                      <AlertDescription>
                        To get started creating API keys to integrate into your
                        application, you need to set up billing for your team.
                      </AlertDescription>
                    </div>

                    <Button asChild className="self-center">
                      <Link to={`/${teamId}/billing`} prefetch="render">
                        Get started
                      </Link>
                    </Button>
                  </div>
                </Alert>
              </div>
            )}

            {billing.legacy ? (
              <div className="p-4">
                <Alert variant="highlight" className="@container">
                  <TriangleExclamationIcon />

                  <div className="flex flex-col gap-4 @md:flex-row @md:items-start @md:justify-between">
                    <div>
                      <AlertTitle>Upgrade to access new features.</AlertTitle>
                      <AlertDescription>
                        To get access to all new features including analytics,
                        you need to upgrade to the new pricing plans.
                      </AlertDescription>
                    </div>

                    <Button asChild className="self-center">
                      <Link to={`/${teamId}/billing`} prefetch="render">
                        Upgrade now
                      </Link>
                    </Button>
                  </div>
                </Alert>
              </div>
            ) : null}

            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </OnboardingProvider>
  );
}
