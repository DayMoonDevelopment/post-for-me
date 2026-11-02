import type { TypedSupabaseClient } from "~/lib/.server/supabase";
import type { UserProfile } from "~/lib/types/user";

import { fromSupabase } from "~/lib/.server/errors";

import type { UsersService } from "./users.service";

/**
 * Supabase-backed {@link UsersService}. RLS scopes which rows are readable (a
 * user can read their own profile, and team members per policy). The mapper
 * renames `first_name`/`last_name` → `firstName`/`lastName` for the DTO.
 */
export function createSupabaseUsersService(
  supabase: TypedSupabaseClient,
): UsersService {
  return {
    async getProfile(id: string): Promise<UserProfile | null> {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, first_name, last_name")
        .eq("id", id)
        .maybeSingle();
      if (error) throw fromSupabase(error);
      if (!data) return null;
      return {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
      };
    },
  };
}
