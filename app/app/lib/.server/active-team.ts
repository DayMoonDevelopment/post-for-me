import type { Project } from "~/lib/types/project";
import type { Team } from "~/lib/types/team";

import {
  LAST_ACTIVE_PROJECT_COOKIE,
  LAST_ACTIVE_TEAM_COOKIE,
} from "~/lib/cookies";

/** Read a named cookie value from the request header, or null. */
function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("=")) || null;
    }
  }
  return null;
}

/** Read the `last_active_team` id from the request cookies, or null. */
export function readActiveTeamId(request: Request): string | null {
  return readCookie(request, LAST_ACTIVE_TEAM_COOKIE);
}

/**
 * The team the user is currently acting on: the cookie's team when they still
 * belong to it, else their first team. Null only when they have no teams. This
 * is the *entry/default* resolution — once ids are in the URL, page loaders read
 * `params.teamId` and don't call this.
 */
export function resolveActiveTeam(request: Request, teams: Team[]): Team | null {
  const id = readActiveTeamId(request);
  return teams.find((team) => team.id === id) ?? teams[0] ?? null;
}

/** Read the `last_active_project` id from the request cookies, or null. */
export function readActiveProjectId(request: Request): string | null {
  return readCookie(request, LAST_ACTIVE_PROJECT_COOKIE);
}

/**
 * The project the user should land on at the bare entry (`/`): the cookie's
 * project when it's still one of theirs, else their first project. Null only
 * when they have no projects (a brand-new user, before onboarding). Entry-only —
 * page loaders read `params.projectId`.
 */
export function resolveActiveProject(
  request: Request,
  projects: Project[],
): Project | null {
  const id = readActiveProjectId(request);
  return projects.find((project) => project.id === id) ?? projects[0] ?? null;
}
