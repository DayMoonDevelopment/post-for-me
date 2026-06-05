import { redirect, data } from "react-router";
import { withSupabase } from "~/lib/.server/supabase";
import {
  trackProjectCreated,
  trackTeamCreated,
} from "~/tracking/.server/lifecycle-tracking";

export const action = withSupabase(
  async ({ request, supabase, supabaseServiceRole }) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw redirect("/logout");
    }

    const formData = await request.formData();
    const name = (formData.get("name") as string)?.trim();

    if (!name || name.length < 2 || name.length > 50) {
      return data({
        success: false,
        errors: { name: "Team name must be between 2 and 50 characters." },
      });
    }

    const result = await supabaseServiceRole
      .from("teams")
      .insert({
        name,
        created_by: userData?.user?.id,
      })
      .select()
      .single();

    if (result.error) {
      console.error(result.error);
      return data({
        success: false,
        errors: { general: "Something went wrong creating the team." },
      });
    }

    const team = result.data;
    const teamId = team.id;

    // Track team creation + the default project the DB trigger creates with it.
    // Fire-and-forget so analytics can't slow or break team creation.
    void (async () => {
      await trackTeamCreated({
        supabase: supabaseServiceRole,
        team: {
          id: team.id,
          name: team.name,
          created_by: team.created_by ?? userData.user.id,
          created_at: team.created_at,
        },
        creationContext: "manual",
      });

      const { data: projects } = await supabaseServiceRole
        .from("projects")
        .select("id, name, team_id, created_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true });

      for (const project of projects ?? []) {
        await trackProjectCreated({
          supabase: supabaseServiceRole,
          project,
          actorUserId: userData.user.id,
        });
      }
    })().catch((err) => {
      console.error("Failed to capture team_created lifecycle events:", err);
    });

    // Return success data instead of redirecting
    return data({
      success: true,
      teamId: teamId,
      message: "Team created successfully",
    });
  }
);
