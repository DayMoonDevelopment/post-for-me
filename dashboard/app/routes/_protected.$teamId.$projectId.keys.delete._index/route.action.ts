import { data, redirect } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";
import { unkey } from "~/lib/.server/unkey";

export const action = withSupabase(async ({ supabase, request, params }) => {
  const { teamId, projectId } = params;
  const formData = await request.formData();
  const keyId = formData.get("keyId") as string;

  if (!teamId) {
    throw new Error("Team code is required");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  if (!keyId) {
    return data({
      success: false,
      errors: {
        general: "There was an error removing the API Key from the project",
        keyId: "Key ID is required",
      },
    });
  }

  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  try {
    await unkey.keys.deleteKey({
      keyId,
    });

    return redirect(`../?toast=API Key was deleted&toast_type=success`);
  } catch (error) {
    return data({
      success: false,
      error: (error as { message?: string })?.message,
      result: null,
    });
  }
});
