import { data } from "react-router";
import { withSupabase } from "~/lib/.server/supabase";

export const action = withSupabase(async ({ supabase, params, request }) => {
  const { teamId, projectId } = params;

  if (!teamId) {
    throw new Error("Team code is required");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const formData = await request.formData();
  const authCallbackUrl = formData.get("auth_callback_url") as string;

  const updateResult = await supabase
    .from("projects")
    .update({ auth_callback_url: authCallbackUrl?.trim() || null })
    .eq("id", projectId)
    .select("auth_callback_url")
    .single();

  if (updateResult.error) {
    return data({
      success: false,
      toast_msg: "Unable to save the redirect url",
    });
  }

  return data({
    success: true,
    toast_msg: "Redirect URL updated successfully",
  });
});
