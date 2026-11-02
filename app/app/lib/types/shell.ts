import type { TeamWithProjects } from "./team";
import type { UserProfile } from "./user";

/**
 * What every app shell needs to render its chrome: who's signed in, the tenants
 * they can switch between, and the persisted sidebar state.
 *
 * Both shells (`_project`, `_team`) return this from their loader — composed by
 * `loadShellData()` — so the shared `AppShell` parts read one shape regardless
 * of which shell is mounted. A shell may return MORE than this (`_project` adds
 * `showOnboarding`); this is the floor.
 */
export interface ShellData {
  sidebarOpen: boolean;
  teams: TeamWithProjects[];
  user: UserProfile;
}
