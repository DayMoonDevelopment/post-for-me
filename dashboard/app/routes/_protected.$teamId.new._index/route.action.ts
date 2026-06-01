import { redirect, data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
import { currentUserIsInTeam } from "~/lib/.server/current-user-is-in-team.request";
import { trackProjectCreated } from "~/tracking/.server/lifecycle-tracking";

export const action = withSupabase(
  async ({ supabase, supabaseServiceRole, params, request }) => {
    const { teamId } = params;

    if (!teamId) {
      return data({
        success: false,
        errors: { general: "Missing team code." },
      });
    }

    const formData = await request.formData();
    const name = (formData.get("name") as string) || null;

    const [isInTeam, currentUser] = await currentUserIsInTeam(
      { teamId },
      supabase
    );

    if (!isInTeam || !currentUser) return redirect("/");

    const isSystem = (formData.get("project_type") as string) === "system";

    const project = await supabaseServiceRole
      .from("projects")
      .insert({
        name: name || "My First Project",
        created_by: currentUser.id,
        updated_by: currentUser.id,
        team_id: teamId,
        is_system: isSystem,
      })
      .select()
      .single();

    if (project.error) {
      console.error(project.error);
      return data({
        success: false,
        errors: { general: "Something went wrong creating the project." },
      });
    }

    // Project creation is a strong activation signal. Fire-and-forget.
    void trackProjectCreated({
      supabase: supabaseServiceRole,
      project: {
        id: project.data.id,
        name: project.data.name,
        team_id: project.data.team_id,
        created_at: project.data.created_at,
      },
      actorUserId: currentUser.id,
    }).catch((err) => {
      console.error("Failed to capture project_created:", err);
    });

    return redirect(
      `/${teamId}/${project.data.id}?toast=Project created successfully&toast_type=success`
    );
  }
);
