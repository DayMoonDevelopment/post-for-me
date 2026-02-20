import { data } from "react-router";
import type { Database } from "@post-for-me/db";

import { withSupabase } from "~/lib/.server/supabase";

type SocialProviderEnum = Database["public"]["Enums"]["social_provider"];

export const action = withSupabase(async ({ request, supabase, params }) => {
  const { projectId, provider } = params;

  if (!projectId) {
    return data({ success: false, toast_msg: "Project ID is required" });
  }

  if (!provider) {
    return data({ success: false, toast_msg: "Provider is required" });
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
        toast_msg: "Failed to delete credentials",
      });
    }

    return data({ success: true });
  }

  const appId = formData.get("app_id")?.toString() || "";
  const appSecret = formData.get("app_secret")?.toString() || "";

  // Validate that at least one credential is provided
  if (!appId.trim() && !appSecret.trim()) {
    return data({
      success: false,
      toast_msg: "At least one credential is required",
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
    return data({ success: false, toast_msg: "Failed to save credentials" });
  }

  return data({ success: true });
});
