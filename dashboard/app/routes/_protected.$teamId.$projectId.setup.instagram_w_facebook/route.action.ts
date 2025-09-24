import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
export const action = withSupabase(async ({ request, supabase, params }) => {
  const { projectId } = params;

  if (!projectId) {
    return data({ success: false, toast_msg: "Project ID is required" });
  }

  const formData = await request.formData();
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
        provider: "instagram_w_facebook",
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
