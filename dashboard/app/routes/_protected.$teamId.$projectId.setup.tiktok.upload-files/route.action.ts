import type { Database } from "~/lib/.server/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";

// POST handler for file uploads
export const action = withSupabase(
  async ({ params, request, supabaseServiceRole }) => {
    const method = request.method;
    const { teamId, projectId } = params;

    if (!teamId || !projectId) {
      return data({
        success: false,
        toast_msg: "Team ID and Project ID are required",
      });
    }

    switch (method) {
      case "POST":
        return data(
          await postAction(request, supabaseServiceRole, { teamId, projectId })
        );
      case "DELETE":
        return data(await deleteAction(request, supabaseServiceRole));
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }
);

async function postAction(
  request: Request,
  supabaseServiceRole: SupabaseClient<Database>,
  {
    teamId,
    projectId,
  }: {
    teamId: string;
    projectId: string;
  }
): Promise<{ success: boolean; fileName?: string }> {
  const formData = await request.formData();
  const files = formData.getAll("tiktok_verification_files") as File[];

  if (files.length === 0) {
    return { success: false };
  }

  // Upload files one by one to handle individual errors
  for (const file of files) {
    const { error } = await supabaseServiceRole.storage
      .from("post-media")
      .upload(`${file.name}`, file, {
        cacheControl: "3600",
        upsert: true,
        metadata: {
          team_id: teamId,
          project_id: projectId,
        },
      });

    if (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        fileName: file.name,
      };
    }
  }

  return {
    success: true,
  };
}

async function deleteAction(
  request: Request,
  supabaseServiceRole: SupabaseClient<Database>
): Promise<{ success: boolean }> {
  const formData = await request.formData();
  const fileName = formData.get("fileName") as string;

  // Handle single file deletion
  if (fileName) {
    const { error } = await supabaseServiceRole.storage
      .from("post-media")
      .remove([`${fileName}`]);

    if (error) {
      console.error("Delete error:", error);
      return {
        success: false,
      };
    }

    return { success: true };
  }

  return { success: false };
}
