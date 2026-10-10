import { Outlet, useLoaderData } from "react-router";

import {
  AppShell,
  AppShellContent,
  AppShellFallback,
  useAppShellMatchData,
} from "~/components/shell";
import { useErrorContent } from "~/hooks/use-error-content";
import { ErrorState } from "~/ui/error-state";

import type { Route } from "./+types/route";
import type { loader } from "./route.loader";

import { OnboardingProvider } from "./components/onboarding/onboarding-provider";
import { ProjectSidebar } from "./components/project-sidebar";

export function Component() {
  const { user, teams, sidebarOpen, showOnboarding } =
    useLoaderData<typeof loader>();

  // The project onboarding configures the first team's first project (the
  // auto-created default) — it renames it and sets its credential model. It
  // WRAPS the shell rather than living in it: onboarding is a `_project`
  // concern, not chrome.
  return (
    <OnboardingProvider
      autoOpen={showOnboarding}
      project={teams[0]?.projects[0]}
    >
      <AppShell user={user} teams={teams} sidebarOpen={sidebarOpen}>
        <ProjectSidebar teams={teams} />
        <AppShellContent>
          <Outlet />
        </AppShellContent>
      </AppShell>
    </OnboardingProvider>
  );
}

/**
 * Boundary for everything under the shell. A PAGE-level error (a child route's
 * loader/render throwing) is caught here while the shell's OWN loader data is
 * still available in the route matches — so we re-render the chrome with the
 * error in the content region (the sidebar stays visible). A LAYOUT-level error
 * (the shell's own loader failed) has no shell data, so it falls back to a
 * full-page error.
 *
 * The chrome path still needs an `OnboardingProvider`: `NavTop`'s "Getting
 * started" entry calls `useOnboarding()`, which throws outside one. `autoOpen`
 * is false here — no auto-open while showing an error.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const content = useErrorContent(error);
  const shell = useAppShellMatchData();

  if (!shell) {
    return (
      <AppShellFallback>
        <ErrorState {...content} />
      </AppShellFallback>
    );
  }

  return (
    <OnboardingProvider autoOpen={false} project={shell.teams[0]?.projects[0]}>
      <AppShell {...shell}>
        <ProjectSidebar teams={shell.teams} />
        <AppShellContent>
          <ErrorState {...content} />
        </AppShellContent>
      </AppShell>
    </OnboardingProvider>
  );
}
