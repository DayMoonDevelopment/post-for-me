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

import { TeamSidebar } from "./components/team-sidebar";

export function Component() {
  const { user, teams, sidebarOpen } = useLoaderData<typeof loader>();

  // No `OnboardingProvider` (unlike `_project`): onboarding sets up a PROJECT,
  // so it never runs in team context.
  return (
    <AppShell user={user} teams={teams} sidebarOpen={sidebarOpen}>
      <TeamSidebar teams={teams} />
      <AppShellContent>
        <Outlet />
      </AppShellContent>
    </AppShell>
  );
}

/**
 * Boundary for everything under the shell. A PAGE-level error (a child route's
 * loader/render throwing) is caught here while the shell's OWN loader data is
 * still available in the route matches — so we re-render the chrome with the
 * error in the content region (the sidebar stays visible). A LAYOUT-level error
 * (the shell's own loader failed) has no shell data, so it falls back to a
 * full-page error.
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
    <AppShell {...shell}>
      <TeamSidebar teams={shell.teams} />
      <AppShellContent>
        <ErrorState {...content} />
      </AppShellContent>
    </AppShell>
  );
}
