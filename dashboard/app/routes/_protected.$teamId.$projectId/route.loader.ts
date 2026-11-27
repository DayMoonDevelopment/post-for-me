import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
import {
  observeRouteLoad,
  requireRouteUser,
} from "~/lib/.server/route-diagnostics";

export const loader = withSupabase(async (args) =>
  observeRouteLoad(args, "project", async (diagnostics) => {
    const { supabase, params } = args;
    const { teamId, projectId } = params;

    if (!teamId) {
      throw new Error("Team code is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    await requireRouteUser(diagnostics, supabase);

    const project = await diagnostics.step(
      "project_lookup",
      "PROJECT_LOAD_FAILED",
      () =>
        supabase
          .from("projects")
          .select("id, name, team_id, is_system")
          .eq("team_id", teamId)
          .eq("id", projectId)
          .maybeSingle(),
    );

    if (project.error) diagnostics.fail("PROJECT_LOAD_FAILED", project.error);

    if (!project.data) {
      return diagnostics.fail("PROJECT_NOT_FOUND");
    }

    return data({ project: project.data });
  }),
);
