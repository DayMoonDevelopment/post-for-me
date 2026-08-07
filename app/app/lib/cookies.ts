/**
 * Client-safe cookie name constants (no `.server` — imported by both the browser
 * switcher that writes the cookie and the server helper that reads it).
 */

/** Remembers the team the user last acted on. Read ONLY by the bare-entry
 * redirect / active-team resolution, never for data scoping (ids in the URL are
 * the source of truth for that). */
export const LAST_ACTIVE_TEAM_COOKIE = "last_active_team";

/** Remembers the project the user last acted on — the bare-entry redirect (`/`)
 * lands them back here on a fresh visit. The URL (`/projects/$projectId`) is the
 * live source of truth; this cookie only seeds that entry redirect. */
export const LAST_ACTIVE_PROJECT_COOKIE = "last_active_project";

/** One year — both "last active" cookies persist the selection long-term. */
export const LAST_ACTIVE_MAX_AGE = 60 * 60 * 24 * 365;
/** @deprecated use {@link LAST_ACTIVE_MAX_AGE}; kept for existing imports. */
export const LAST_ACTIVE_TEAM_MAX_AGE = LAST_ACTIVE_MAX_AGE;
