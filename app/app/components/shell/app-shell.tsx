import type { ReactNode } from "react";

import * as React from "react";
import { useMatches } from "react-router";

import type { ShellData } from "~/lib/types/shell";

import { userDisplayName } from "~/lib/types/user";
import { PostHogIdentifier } from "~/tracking/posthog-identifier";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "~/ui/sidebar";

import { NavExternal } from "./nav-external";
import { NavUser } from "./nav-user";

/**
 * The authenticated app chrome, as a compound family.
 *
 * Every signed-in page renders inside one of these; what differs between the
 * shells is only what goes IN the sidebar, so the container, the pinned header,
 * the scrolling content region, the footer, and PostHog identification live
 * here once and each shell assembles its own nav:
 *
 * ```tsx
 * <AppShell {...shellData}>
 *   <ProjectSidebar />            // an AppShellSidebar with its own nav
 *   <AppShellContent><Outlet /></AppShellContent>
 * </AppShell>
 * ```
 *
 * Wrappers a single shell needs (e.g. `_project`'s `OnboardingProvider`) go
 * AROUND `<AppShell>` in that shell's route component — they are not shell
 * chrome and must not leak in here.
 */

const AppShellContext = React.createContext<null | ShellData>(null);

/** The signed-in user and their tenants, for any part inside an `AppShell`. */
export function useAppShell(): ShellData {
  const context = React.useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within an <AppShell>");
  }
  return context;
}

export function AppShell({
  children,
  sidebarOpen,
  teams,
  user,
}: ShellData & { children: ReactNode }) {
  const value = React.useMemo(
    () => ({ user, teams, sidebarOpen }),
    [user, teams, sidebarOpen],
  );
  // The billing group PostHog registers for this session, so browser pageviews
  // share a person/group with the API's server-side billing events. Also merges
  // the prior anonymous session for per-user flags.
  const defaultTeam = teams[0];

  return (
    <AppShellContext.Provider value={value}>
      <PostHogIdentifier
        user={{
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }}
        team={
          defaultTeam
            ? {
                id: defaultTeam.id,
                name: defaultTeam.name,
                stripeCustomerId: defaultTeam.stripeCustomerId,
                billingEmail: defaultTeam.billingEmail,
              }
            : null
        }
      />
      <SidebarProvider data-slot="app-shell" defaultOpen={sidebarOpen}>
        {children}
      </SidebarProvider>
    </AppShellContext.Provider>
  );
}

/** The sidebar container — a shell supplies the header/content/footer parts. */
export function AppShellSidebar({
  children,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar data-slot="app-shell-sidebar" collapsible="icon" {...props}>
      {children}
      <SidebarRail />
    </Sidebar>
  );
}

/** Top of the sidebar — where the context switcher goes. */
export function AppShellSidebarHeader({ children }: { children: ReactNode }) {
  return (
    <SidebarHeader data-slot="app-shell-sidebar-header">
      {children}
    </SidebarHeader>
  );
}

/** The scrolling nav region — where a shell's `NavSection`s go. */
export function AppShellSidebarContent({ children }: { children: ReactNode }) {
  return (
    <SidebarContent data-slot="app-shell-sidebar-content">
      {children}
    </SidebarContent>
  );
}

/**
 * The sidebar footer. Identical in every shell — outbound links plus the
 * signed-in user's account menu — so it owns its own contents and reads the
 * user from context rather than taking it as a prop.
 */
export function AppShellSidebarFooter() {
  const { user } = useAppShell();
  return (
    <SidebarFooter data-slot="app-shell-sidebar-footer">
      <NavExternal />
      <NavUser user={{ name: userDisplayName(user), email: user.email }} />
    </SidebarFooter>
  );
}

/** The page region beside the sidebar: pinned header bar + scrolling content. */
export function AppShellContent({ children }: { children: ReactNode }) {
  return (
    // Fixed to the viewport height so the header bar stays pinned and only the
    // content below it scrolls.
    <SidebarInset data-slot="app-shell-content" className="h-svh overflow-hidden">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <SidebarTrigger className="-ms-1" />
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        {children}
      </div>
    </SidebarInset>
  );
}

/**
 * The chrome-LESS frame, for when there's no shell data to render chrome with —
 * i.e. a shell's own loader threw, so its `ErrorBoundary` has nothing to rebuild
 * the sidebar from.
 */
export function AppShellFallback({ children }: { children: ReactNode }) {
  return (
    <main data-slot="app-shell-fallback" className="flex min-h-svh flex-col">
      {children}
    </main>
  );
}

function isShellData(value: unknown): value is ShellData {
  return (
    typeof value === "object" &&
    value !== null &&
    "user" in value &&
    "teams" in value &&
    "sidebarOpen" in value
  );
}

/**
 * The mounted shell's loader data, pulled from the route matches.
 *
 * For `ErrorBoundary` use: a PAGE-level error (a child route's loader/render
 * throwing) is caught while the SHELL's own data is still in the matches, so the
 * boundary can re-render the chrome with the error inside it. Returns
 * `undefined` when the shell's own loader is what failed — render an
 * {@link AppShellFallback} then.
 */
export function useAppShellMatchData(): ShellData | undefined {
  return useMatches()
    .map((match) => match.loaderData)
    .find(isShellData);
}
