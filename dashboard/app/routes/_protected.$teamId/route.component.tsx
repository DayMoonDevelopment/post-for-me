import { Link, Outlet, useLoaderData, useParams } from "react-router";

import { TriangleExclamationIcon } from "icons";

import { OnboardingProvider } from "~/components/onboarding-provider";

import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { SidebarInset, SidebarProvider } from "~/ui/sidebar";
import { Button } from "~/ui/button";

import { AppSidebar } from "./_app-sidebar";
import { Header } from "./_header";

import type { Route } from "./+types/route";

export function Component() {
  const { teamId } = useParams();
  const { billing } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <OnboardingProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />

          <div className="@container/main">
            {billing.active ? null : (
              <div className="p-4">
                <Alert variant="informative" className="@container">
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
                <Alert variant="informative" className="@container">
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
