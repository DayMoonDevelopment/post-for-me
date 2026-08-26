import type { UserProfile } from "~/lib/types/user";

/**
 * Reads user profile data (name, etc.) — the profile half of the
 * identity/profile split. Auth (`AuthService`) answers "who is the requester";
 * this answers "what's their profile". Keyed by id so it can also resolve other
 * users (e.g. team members), not just the current one.
 */
export interface UsersService {
  /** The profile for a user id, or null if not found / not accessible. */
  getProfile(id: string): Promise<UserProfile | null>;
}
