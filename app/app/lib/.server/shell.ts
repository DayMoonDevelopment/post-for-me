import type { RouterContextProvider } from "react-router";

import type { ShellData } from "~/lib/types/shell";

import { currentUserContext, servicesContext } from "~/lib/.server/services";

/**
 * The data every app shell's chrome needs, loaded once in one place.
 *
 * Both shell layouts (`_project`, `_team`) call this from their `route.loader`
 * and spread the result, adding only what's specific to them (`_project` adds
 * the onboarding flag). Keeping the fan-out here is what stops the two shells'
 * notion of "the current user and their tenants" from drifting apart.
 *
 * Identity is already resolved and guaranteed by the `protected` group's route
 * middleware (the single auth gate) — this reads it, it does not re-check it.
 */
export async function loadShellData(
  request: Request,
  context: Readonly<RouterContextProvider>,
): Promise<ShellData> {
  const sessionUser = context.get(currentUserContext);

  // Independent services, fetched in parallel through their ports. None knows
  // the others exist, and none knows it's talking to Supabase. Teams + projects
  // are composed into the nested shape the switcher wants.
  const { users, teams, projects } = context.get(servicesContext);
  const [profile, teamList, projectList] = await Promise.all([
    users.getProfile(sessionUser.id),
    teams.list(),
    projects.list(),
  ]);

  // Honor the persisted sidebar state (written client-side by SidebarProvider)
  // so the server-rendered markup matches and there's no expand/collapse flash.
  const cookie = request.headers.get("Cookie") ?? "";
  const sidebarOpen = !/(?:^|;\s*)sidebar_state=false(?:;|$)/.test(cookie);

  return {
    user: {
      id: sessionUser.id,
      // The profile row is the source of truth for name; fall back to the JWT
      // email if the profile row doesn't exist yet.
      email: profile?.email ?? sessionUser.email,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
    },
    teams: teamList.map((team) => ({
      ...team,
      projects: projectList.filter((project) => project.teamId === team.id),
    })),
    sidebarOpen,
  };
}
