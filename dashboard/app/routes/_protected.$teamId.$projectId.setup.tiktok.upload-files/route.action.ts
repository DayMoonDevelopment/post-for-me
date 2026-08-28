import { data } from "react-router";
import { getStorageProvider } from "~/lib/.server/storage/storage.provider";
import { MEDIA_BUCKET } from "~/lib/.server/media.constants";
import { isR2StorageEnabled } from "~/tracking/.server/posthog";

import { withSupabase } from "~/lib/.server/supabase";
import type { SupabaseContext } from "~/lib/.server/supabase";

type SupabaseServerClient = SupabaseContext["supabase"];

// POST handler for file uploads
export const action = withSupabase(async ({ supabase, params, request }) => {
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
      return data(await postAction(request, { supabase, teamId, projectId }));
    case "DELETE":
      return data(
        await deleteAction(request, { supabase, teamId, projectId }),
      );
    default:
      throw new Error(`Method ${method} not supported`);
  }
});

async function postAction(
  request: Request,
  {
    supabase,
    teamId,
    projectId,
  }: {
    supabase: SupabaseServerClient;
    teamId: string;
    projectId: string;
  },
): Promise<{ success: boolean; fileName?: string }> {
  const formData = await request.formData();
  const files = formData.getAll("tiktok_verification_files") as File[];

  if (files.length === 0) {
    return { success: false };
  }

  const [storageProvider, usesR2] = await Promise.all([
    getStorageProvider(teamId, projectId),
    isR2StorageEnabled(teamId, projectId),
  ]);

  // Upload files one by one to handle individual errors
  for (const file of files) {
    try {
      await storageProvider.upload(MEDIA_BUCKET, `${file.name}`, file, {
        cacheControl: "3600",
        upsert: true,
        metadata: {
          team_id: teamId,
          project_id: projectId,
        },
      });

      const { error } = await supabase.from("tiktok_verification_files").upsert(
        {
          project_id: projectId,
          provider: usesR2 ? "r2" : "supabase",
          bucket: MEDIA_BUCKET,
          key: file.name,
          file_name: file.name,
        },
        { onConflict: "file_name" },
      );
      if (error) throw error;
    } catch (error) {
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
  {
    supabase,
    teamId,
    projectId,
  }: {
    supabase: SupabaseServerClient;
    teamId: string;
    projectId: string;
  },
): Promise<{ success: boolean }> {
  const formData = await request.formData();
  const fileName = formData.get("fileName") as string;

  // Handle single file deletion
  if (fileName) {
    const storageProvider = await getStorageProvider(teamId, projectId);
    try {
      await storageProvider.remove(MEDIA_BUCKET, [`${fileName}`]);
      const { error } = await supabase
        .from("tiktok_verification_files")
        .delete()
        .eq("project_id", projectId)
        .eq("file_name", fileName);
      if (error) throw error;
    } catch (error) {
      console.error("Delete error:", error);
      return {
        success: false,
      };
    }

    return { success: true };
  }

  return { success: false };
}
