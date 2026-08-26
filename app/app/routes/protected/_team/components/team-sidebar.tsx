import type { TeamWithProjects } from "~/lib/types/team";

import {
  AppShellSidebar,
  AppShellSidebarContent,
  AppShellSidebarFooter,
  AppShellSidebarHeader,
  ContextSwitcher,
  ContextSwitcherTeamTrigger,
  type NavItem,
  NavSection,
} from "~/components/shell";
import { useActiveTeamId } from "~/hooks/use-active-team-id";
import { useRouteProjectId } from "~/hooks/use-route-project-id";
import { BillingIcon } from "~/icons";

import { NavProjects } from "./nav-projects";

/** The TEAM-context sidebar: what a team owns, no project required. */
export function TeamSidebar({ teams }: { teams: TeamWithProjects[] }) {
  // The active team supplies the team-scoped nav links: the team the current
  // route belongs to (`/teams/$teamId/…`), else the team owning the active
  // project, else the first team.
  const routeProjectId = useRouteProjectId();
  const activeTeamId = useActiveTeamId(teams, routeProjectId);
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;

  // Team-scoped nav. Billing is the only team page that exists today — the rest
  // (overview, members, team settings) get entries here as they land. Unlabeled:
  // the switcher above already establishes that everything here is team-scoped.
  const teamNav: NavItem[] = [
    {
      titleKey: "sidebar.nav.billing",
      url: activeTeamId ? `/teams/${activeTeamId}/billing` : "#",
      icon: BillingIcon,
    },
  ];

  return (
    <AppShellSidebar>
      <AppShellSidebarHeader>
        {/* No `fallbackProject`: on a team page, claiming an active project
            would assert a context we aren't in. */}
        <ContextSwitcher teams={teams}>
          <ContextSwitcherTeamTrigger />
        </ContextSwitcher>
      </AppShellSidebarHeader>
      <AppShellSidebarContent>
        <NavSection items={teamNav} />
        <NavProjects
          projects={activeTeam?.projects ?? []}
          teamId={activeTeamId}
        />
      </AppShellSidebarContent>
      <AppShellSidebarFooter />
    </AppShellSidebar>
  );
}
