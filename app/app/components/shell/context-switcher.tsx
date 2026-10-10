import type { ReactNode } from "react";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import type { Project } from "~/lib/types/project";
import type { TeamWithProjects } from "~/lib/types/team";

import { NewProjectModal } from "~/components/new-project";
import { TeamAvatar } from "~/components/team-badge";
import { useActiveTeamId } from "~/hooks/use-active-team-id";
import { useRouteProjectId } from "~/hooks/use-route-project-id";
import {
  AddIcon,
  BillingIcon,
  ExpandIcon,
  MoreIcon,
  ProjectActiveIcon,
  ProjectIcon,
  SettingsIcon,
} from "~/icons";
import {
  LAST_ACTIVE_MAX_AGE,
  LAST_ACTIVE_PROJECT_COOKIE,
  LAST_ACTIVE_TEAM_COOKIE,
} from "~/lib/cookies";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { ProjectTypeAvatar, ProjectTypeIcon } from "~/ui/project-type-badge";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/ui/sidebar";

/**
 * The sidebar-header tenant switcher, shared by every app shell.
 *
 * The dropdown BODY — projects, teams, and the billing/settings tail — is the
 * same everywhere, because switching context is the same operation wherever you
 * start. What differs is what the closed trigger ADVERTISES, so the trigger is
 * the slot each shell fills:
 *
 * ```tsx
 * <ContextSwitcher teams={teams} fallbackProject={teams[0]?.projects[0]}>
 *   <ContextSwitcherProjectTrigger />
 * </ContextSwitcher>
 * ```
 *
 * Tenant names stay literal while every surrounding label is localized.
 */

// How many items to show inline before collapsing the rest into a submenu.
const MAX_INLINE = 3;

type ContextSwitcherValue = {
  activeProject: null | Project;
  activeTeam: TeamWithProjects;
};

const ContextSwitcherContext = React.createContext<ContextSwitcherValue | null>(
  null,
);

/** The resolved active team/project, for a trigger part. */
function useContextSwitcher(): ContextSwitcherValue {
  const context = React.useContext(ContextSwitcherContext);
  if (!context) {
    throw new Error(
      "ContextSwitcher trigger parts must be used within a <ContextSwitcher>",
    );
  }
  return context;
}

/** Order a list so the active item always leads (rest keep their original
 * order), then split into the first MAX_INLINE shown inline and the remainder
 * for the "More …" submenu. */
function partition<T extends { id: string }>(items: T[], activeId: string) {
  const active = items.find((item) => item.id === activeId);
  const ordered = active
    ? [active, ...items.filter((item) => item.id !== activeId)]
    : items;
  return {
    visible: ordered.slice(0, MAX_INLINE),
    overflow: ordered.slice(MAX_INLINE),
  };
}

export function ContextSwitcher({
  children,
  fallbackProject,
  teams,
}: {
  /** The trigger part — what the closed switcher advertises. */
  children: ReactNode;
  /**
   * The project to treat as active when the ROUTE supplies none. Project-context
   * shells pass the first project so a brand-new user at `/` still sees one;
   * team-context shells omit it, because claiming an active project on a team
   * page would assert a context we aren't in.
   */
  fallbackProject?: Project | undefined;
  teams: TeamWithProjects[];
}) {
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  // Which team's "New project" was clicked — null when the dialog is closed.
  // Controlled (not an uncontrolled Modal-per-trigger) because two different
  // rows (the active team's item, and each other team's submenu item) share
  // one dialog but target different teams.
  const [newProjectTeamId, setNewProjectTeamId] = React.useState<
    string | null
  >(null);

  // The active project is the one the current route belongs to (see
  // `useRouteProjectId` — URL param on project pages, loader data on prefix-less
  // resource pages). Selecting one navigates there, so the choice survives a
  // refresh.
  const routeProjectId = useRouteProjectId();
  const allProjects = teams.flatMap((team) => team.projects);
  const activeProject =
    allProjects.find((project) => project.id === routeProjectId) ??
    fallbackProject ??
    null;
  // Team-scoped routes (`/teams/$teamId/billing`) supply no project, so the
  // active team comes from the URL there — otherwise the switcher would show
  // the first org while you're on a different one's billing page.
  const resolvedTeamId = useActiveTeamId(teams, activeProject?.id);
  const activeTeam =
    teams.find((team) => team.id === resolvedTeamId) ?? teams[0];
  const value = React.useMemo(
    () => (activeTeam ? { activeTeam, activeProject } : null),
    [activeTeam, activeProject],
  );
  // All hooks have run; safe to bail if the user belongs to no teams.
  if (!activeTeam || !value) return null;

  const activeTeamId = activeTeam.id;
  const activeProjectId = activeProject?.id ?? "";

  // Persist the selection for the bare-entry redirect (`/` → last project). The
  // URL is the live source of truth; these cookies only seed that redirect.
  function persist(projectId: string, teamId: string) {
    const attrs = `path=/; max-age=${LAST_ACTIVE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `${LAST_ACTIVE_PROJECT_COOKIE}=${projectId}; ${attrs}`;
    document.cookie = `${LAST_ACTIVE_TEAM_COOKIE}=${teamId}; ${attrs}`;
  }

  function selectProject(project: Project) {
    persist(project.id, project.teamId);
    void navigate(`/projects/${project.id}`);
  }
  function selectTeam(team: TeamWithProjects) {
    // Selecting a team lands on its BILLING page — the only team-scoped page
    // that exists today. `/teams/$teamId` (the overview this used to target) was
    // never built, so selecting an org 404'd. Repoint this at the overview when
    // it lands. The cookie just seeds the bare-entry redirect (`/` → last team)
    // so the choice survives a refresh.
    document.cookie = `${LAST_ACTIVE_TEAM_COOKIE}=${team.id}; path=/; max-age=${LAST_ACTIVE_MAX_AGE}; SameSite=Lax`;
    void navigate(`/teams/${team.id}/billing`);
  }
  function createProject(team: TeamWithProjects) {
    setNewProjectTeamId(team.id);
  }

  const projects = partition(activeTeam.projects, activeProjectId);
  const orgs = partition(teams, activeTeamId);

  const renderProject = (project: Project) => {
    const active = project.id === activeProjectId;
    // Filled folder marks the selected project (replaces the trailing check).
    const FolderIcon = active ? ProjectActiveIcon : ProjectIcon;
    return (
      <DropdownMenuItem
        key={project.id}
        onClick={() => selectProject(project)}
        className={active ? "font-medium" : undefined}
      >
        <FolderIcon />
        <span className="flex-1 truncate">{project.name}</span>
        <ProjectTypeIcon type={project.type} className="size-3.5! shrink-0" />
      </DropdownMenuItem>
    );
  };

  // The active team's projects already lead the menu under "Projects", so it
  // renders as a plain row — no submenu. Every other team expands on hover to
  // reveal its own projects plus a team-scoped "New project". Either way the
  // row click navigates to the team overview (`/teams/$id`); the trigger's
  // mouse-click is not swallowed by the submenu toggle (base-ui `ignoreMouse`
  // on hover-open), so `onClick` is free to navigate.
  const teamRow = (team: TeamWithProjects) => (
    <>
      <TeamAvatar name={team.name} className="size-5 text-[10px]" />
      <span className="flex-1 truncate">{team.name}</span>
    </>
  );

  const renderTeam = (team: TeamWithProjects) => {
    if (team.id === activeTeamId) {
      return (
        <DropdownMenuItem
          key={team.id}
          onClick={() => selectTeam(team)}
          className="font-medium"
        >
          {teamRow(team)}
        </DropdownMenuItem>
      );
    }
    return (
      <DropdownMenuSub key={team.id}>
        <DropdownMenuSubTrigger onClick={() => selectTeam(team)}>
          {teamRow(team)}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
          {team.projects.map(renderProject)}
          {team.projects.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            className="text-primary focus:text-primary"
            onClick={() => createProject(team)}
          >
            <AddIcon />
            <span>{t("sidebar.switcher.newProject")}</span>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  return (
    <ContextSwitcherContext.Provider value={value}>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                />
              }
            >
              {children}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-(--anchor-width) min-w-64 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "inline-end"}
              sideOffset={4}
            >
              {/* PROJECT — a few inline, the rest under "More projects" */}
              <DropdownMenuLabel className="text-muted-foreground">
                {t("sidebar.switcher.project")}
              </DropdownMenuLabel>
              {projects.visible.map(renderProject)}
              {projects.overflow.length > 0 ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <MoreIcon />
                    <span className="flex-1 truncate">
                      {t("sidebar.switcher.moreProjects")}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
                    {projects.overflow.map(renderProject)}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              <DropdownMenuItem
                className="text-primary focus:text-primary"
                onClick={() => createProject(activeTeam)}
              >
                <AddIcon />
                <span>{t("sidebar.switcher.newProject")}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* TEAM — a few inline, the rest under "More teams" */}
              <DropdownMenuLabel className="text-muted-foreground">
                {t("sidebar.switcher.team")}
              </DropdownMenuLabel>
              {orgs.visible.map(renderTeam)}
              {orgs.overflow.length > 0 ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <MoreIcon />
                    <span className="flex-1 truncate">
                      {t("sidebar.switcher.moreTeams")}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 w-56 overflow-y-auto">
                    {orgs.overflow.map(renderTeam)}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              {/* No create-team mechanism yet — disabled so it doesn't read as
                  clickable and then do nothing. */}
              <DropdownMenuItem
                disabled
                className="text-primary focus:text-primary"
              >
                <AddIcon />
                <span>{t("sidebar.switcher.newTeam")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link to={`/teams/${activeTeamId}/billing`} />}
              >
                <BillingIcon />
                <span>{t("sidebar.switcher.billingUsage")}</span>
              </DropdownMenuItem>
              {/* Team settings has no page yet (see the team overview issue). */}
              <DropdownMenuItem disabled>
                <SettingsIcon />
                <span>{t("sidebar.switcher.teamSettings")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      {newProjectTeamId ? (
        <NewProjectModal
          teamId={newProjectTeamId}
          open
          onOpenChange={(open) => {
            if (!open) setNewProjectTeamId(null);
          }}
        />
      ) : null}
    </ContextSwitcherContext.Provider>
  );
}

/**
 * Project-context trigger: the project is the headline, its owning team the
 * small line above it. Falls back to the team badge before any project exists.
 */
export function ContextSwitcherProjectTrigger() {
  const { activeTeam, activeProject } = useContextSwitcher();
  return (
    <>
      {activeProject ? (
        <ProjectTypeAvatar type={activeProject.type} className="size-8" />
      ) : (
        <TeamAvatar
          name={activeTeam.name}
          className="aspect-square size-8 text-sm"
        />
      )}
      <div className="grid flex-1 text-start leading-tight">
        <span className="truncate text-[11px] text-sidebar-foreground/70">
          {activeTeam.name}
        </span>
        <span className="truncate text-sm font-medium">
          {activeProject?.name ?? ""}
        </span>
      </div>
      <ExpandIcon className="ms-auto size-4" />
    </>
  );
}

/** Team-context trigger: the team leads — its badge and its name, one line. */
export function ContextSwitcherTeamTrigger() {
  const { activeTeam } = useContextSwitcher();
  return (
    <>
      <TeamAvatar
        name={activeTeam.name}
        className="aspect-square size-8 text-sm"
      />
      <div className="grid flex-1 text-start leading-tight">
        <span className="truncate text-sm font-medium">{activeTeam.name}</span>
      </div>
      <ExpandIcon className="ms-auto size-4" />
    </>
  );
}
