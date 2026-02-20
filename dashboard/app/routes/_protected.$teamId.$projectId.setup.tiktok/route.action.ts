import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@post-for-me/db";

type SocialProviderEnum = Database["public"]["Enums"]["social_provider"];

export const action = withSupabase(
  async ({ request, supabase, supabaseServiceRole, params }) => {
    const { projectId } = params;
    const provider = "tiktok"; // Hardcode since this is the TikTok-specific route

    if (!projectId) {
      throw new Response("Project ID is required", { status: 400 });
    }

    const formData = await request.formData();
    const action = formData.get("action")?.toString();

    if (action === "delete") {
      const { error } = await supabase
        .from("social_provider_app_credentials")
        .delete()
        .eq("project_id", projectId)
        .eq("provider", provider as SocialProviderEnum);

      if (error) {
        return data({
          success: false,
          toast_msg: "There was an issue deleting your credentials.",
        });
      }

      return data({
        success: true,
        toast_msg: "TikTok configuration deleted!",
      });
    }

    const appId = formData.get("app_id")?.toString() || "";
    const appSecret = formData.get("app_secret")?.toString() || "";

    if (!appId.trim() && !appSecret.trim()) {
      return data({
        success: false,
        toast_msg: "At least one credential is required.",
      });
    }

    try {
      const { success } = await processTikTokSettings(
        formData,
        supabaseServiceRole
      );

      if (!success) {
        return data({
          success: false,
          toast_msg: "There was an issue processing your verification files.",
        });
      }

      const { error } = await supabase
        .from("social_provider_app_credentials")
        .upsert(
          {
            project_id: projectId,
            provider: provider as SocialProviderEnum,
            app_id: appId,
            app_secret: appSecret,
          },
          { onConflict: "provider,project_id" }
        );

      if (error) {
        console.error("Database upsert error:", error);
        return data({
          success: false,
          toast_msg: "There was an issue saving your credentials.",
        });
      }

      return data({ success: true, toast_msg: "TikTok configuration saved!" });
    } catch (e) {
      console.error("TikTok action error:", e);
      return data({
        success: false,
        toast_msg: "There was an issue processing your verification files.",
      });
    }
  }
);

async function processTikTokSettings(
  formData: FormData,
  supabaseServiceRole: SupabaseClient<Database>
): Promise<{ success: boolean }> {
  const files = formData.getAll("verification_files") as File[];

  for (const file of files) {
    const { error } = await supabaseServiceRole.storage
      .from("post-media")
      .upload(file.name, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("File upload error:", error);
      return { success: false };
    }
  }

  return { success: true };
}
