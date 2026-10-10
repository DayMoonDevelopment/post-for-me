import type { TeamWithProjects } from "~/lib/types/team";

import {
  AppShellSidebar,
  AppShellSidebarContent,
  AppShellSidebarFooter,
  AppShellSidebarHeader,
  ContextSwitcher,
  ContextSwitcherProjectTrigger,
  type NavItem,
  NavSection,
} from "~/components/shell";
import { useRouteProjectId } from "~/hooks/use-route-project-id";
import {
  ApiKeysIcon,
  HomeIcon,
  PlaygroundIcon,
  PostsIcon,
  SettingsIcon,
  SocialAccountsIcon,
  WebhooksIcon,
} from "~/icons";

import { NavTop } from "./nav-top";

/** The PROJECT-context sidebar: everything that needs a project to operate. */
export function ProjectSidebar({ teams }: { teams: TeamWithProjects[] }) {
  // The active project supplies the project-scoped nav links: the project the
  // current route belongs to (see `useRouteProjectId`), else the first project.
  const routeProjectId = useRouteProjectId();
  const firstProject = teams[0]?.projects[0];
  const activeProjectId = routeProjectId ?? firstProject?.id ?? null;
  const projectHome = activeProjectId ? `/projects/${activeProjectId}` : "#";

  // Project landing — the launchpad at the project home.
  const homeNav: NavItem[] = [
    { titleKey: "sidebar.nav.home", url: projectHome, icon: HomeIcon },
  ];
  // Composing, connecting, and publishing content. Playground + Accounts are
  // live; Posts links out to the read-only list.
  const socialPostingNav: NavItem[] = [
    {
      titleKey: "sidebar.nav.playground",
      url: activeProjectId ? `/projects/${activeProjectId}/playground` : "#",
      icon: PlaygroundIcon,
    },
    {
      titleKey: "sidebar.nav.accounts",
      url: activeProjectId
        ? `/projects/${activeProjectId}/social-accounts`
        : "#",
      icon: SocialAccountsIcon,
    },
    {
      titleKey: "sidebar.nav.posts",
      url: activeProjectId ? `/projects/${activeProjectId}/social-posts` : "#",
      icon: PostsIcon,
    },
  ];
  const setupNav: NavItem[] = [
    {
      titleKey: "sidebar.nav.projectSettings",
      url: activeProjectId ? `/projects/${activeProjectId}/settings` : "#",
      icon: SettingsIcon,
    },
    {
      titleKey: "sidebar.nav.apiKeys",
      url: activeProjectId ? `/projects/${activeProjectId}/api-keys` : "#",
      icon: ApiKeysIcon,
    },
    {
      titleKey: "sidebar.nav.webhooks",
      url: activeProjectId ? `/projects/${activeProjectId}/webhooks` : "#",
      icon: WebhooksIcon,
    },
  ];

  return (
    <AppShellSidebar>
      <AppShellSidebarHeader>
        {/* A brand-new user at `/` carries no route project, so the first one
            stands in — this shell always has a project context. */}
        <ContextSwitcher teams={teams} fallbackProject={firstProject}>
          <ContextSwitcherProjectTrigger />
        </ContextSwitcher>
      </AppShellSidebarHeader>
      <AppShellSidebarContent>
        <NavTop />
        <NavSection items={homeNav} />
        <NavSection
          labelKey="sidebar.groups.socialPosting"
          items={socialPostingNav}
        />
        <NavSection labelKey="sidebar.groups.setup" items={setupNav} />
      </AppShellSidebarContent>
      <AppShellSidebarFooter />
    </AppShellSidebar>
  );
}
