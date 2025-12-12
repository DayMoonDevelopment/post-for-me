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

  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;
  const connectionId = formData.get("connectionId") as string;

  if (!connectionId) {
    return data({ error: "Connection ID is required" }, { status: 400 });
  }

  try {
    if (action === "mark-test-user") {
      // Insert into test_social_provider_connections
      const { error } = await supabase
        .from("test_social_provider_connections")
        .insert({
          social_provider_connection_id: connectionId,
          name: "Test User",
        });

      if (error) {
        // Handle the case where the record might already exist
        if (error.code === "23505") {
          // Unique constraint violation
          return data({ success: true }); // Already marked as test user
        }
        throw error;
      }
    } else if (action === "unmark-test-user") {
      // Remove from test_social_provider_connections
      const { error } = await supabase
        .from("test_social_provider_connections")
        .delete()
        .eq("social_provider_connection_id", connectionId);

      if (error) throw error;
    } else {
      return data({ error: "Invalid action" }, { status: 400 });
    }

    return data({ success: true });
  } catch (error) {
    console.error("Error updating test user status:", error);
    return data(
      {
        error: "Failed to update test user status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
