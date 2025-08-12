import { redirect } from "react-router";
import { withSupabase } from "~/lib/.server/supabase";
import { currentUserIsInTeam } from "~/lib/.server/current-user-is-in-team.request";

export const loader = withSupabase(async ({ supabase, params }) => {
  const { teamId, projectId } = params;

  if (!teamId || !projectId) {
    throw new Error("Team ID and Project ID are required");
  }

  const [isInTeam, currentUser] = await currentUserIsInTeam(
    { teamId },
    supabase
  );

  if (!isInTeam || !currentUser) {
    return redirect("/");
  }

  return null;
});
