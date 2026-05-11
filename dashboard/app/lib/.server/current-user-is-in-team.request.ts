import type { Database } from "~/lib/.server/database.types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function currentUserIsInTeam(
  { teamId }: { teamId?: string },
  supabase: SupabaseClient<Database>
): Promise<[boolean, User | null]> {
  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    return [false, user.data.user];
  }

  const teamUserReq = supabase.from("team_users").select("team_id");

  if (teamId) {
    teamUserReq.eq("team_id", teamId).eq("user_id", user.data.user.id);
  }

  const teamUser = await teamUserReq.maybeSingle();

  const isInTeam = !!teamUser?.data?.team_id;

  return [isInTeam, user.data.user];
}
