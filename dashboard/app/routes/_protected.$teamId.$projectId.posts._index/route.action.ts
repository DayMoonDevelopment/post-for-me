import { data } from "react-router";

import { withDashboardKey } from "~/lib/.server/api/api";
import { withSupabase } from "~/lib/.server/supabase";
import { API_URL } from "~/lib/.server/api/api.constants";

import type { PostWithConnections } from "./_types";

export interface PostsResponse {
  data: PostWithConnections[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const action = withSupabase(
  withDashboardKey(async ({ request, apiKey, params, supabase }) => {
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

    if (!apiKey) {
      return data(
        {
          success: false,
          toast_msg:
            "No active subscription for this team. Please upgrade to manage posts.",
        },
        { status: 403 },
      );
    }

    try {
      const formData = await request.formData();
      const actionType = formData.get("action");

      switch (actionType) {
        case "delete-post": {
          const postId = formData.get("postId");

          if (!postId || typeof postId !== "string") {
            return data(
              {
                success: false,
                toast_msg: "Missing post id.",
              },
              { status: 400 },
            );
          }

          const response = await fetch(`${API_URL}/v1/social-posts/${postId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (!response.ok) {
            return data(
              {
                success: false,
                toast_msg: "Failed to delete post.",
              },
              { status: response.status },
            );
          }

          return data({ success: true, toast_msg: "Post deleted." });
        }
        default: {
          return data(
            {
              success: false,
              toast_msg: "Unknown action.",
            },
            { status: 400 },
          );
        }
      }
    } catch (error) {
      console.error("Failed to handle posts action:", error);
      return data(
        {
          success: false,
          toast_msg:
            error instanceof Error
              ? error.message
              : "Failed to handle posts action",
        },
        { status: 500 },
      );
    }
  }),
);
