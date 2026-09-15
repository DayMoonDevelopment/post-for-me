import { data } from "react-router";
import { withDashboardKey } from "~/lib/.server/api/api";
import { withSupabase } from "~/lib/.server/supabase";
import { API_URL } from "~/lib/.server/api/api.constants";
import type { PostWithConnections } from "./_types";

export interface PostsResponse {
  data: PostWithConnections[];
  meta: {
    offset: number;
    limit: number;
    total: number;
    next: string;
  };
}

export const loader = withSupabase(
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

    const url = new URL(request.url);

    // Extract query parameters for pagination and sorting
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const status = url.searchParams.get("status");

    if (!apiKey) {
      return data({
        success: false,
        error:
          "No active subscription for this team. Please upgrade to view posts.",
        posts: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        projectId,
      });
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      offset: ((page - 1) * limit).toString(),
      limit: limit.toString(),
    });

    // Add optional filters
    if (status) {
      queryParams.append("status", status);
    }

    try {
      // Fetch posts for the project with pagination and sorting
      const postsResponse = await fetch(
        `${API_URL}/v1/social-posts?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!postsResponse.ok) {
        console.error(
          "Error fetching posts:",
          postsResponse.status,
          postsResponse.statusText
        );
        return data({
          success: false,
          error: "Failed to fetch posts",
          posts: [],
          totalCount: 0,
          currentPage: page,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          projectId,
        });
      }

      const postsData: PostsResponse = await postsResponse.json();
      const posts = postsData.data || [];

      // Fetch per-account results for the page in a single query and fold them
      // into a per-platform status (failed > processing > success priority).
      const postIds = posts.map((p) => p.id);
      if (postIds.length > 0) {
        const { data: resultRows } = await supabase
          .from("social_post_results")
          .select("post_id, provider_connection_id, success, is_processing")
          .in("post_id", postIds);

        const resultsByPost = new Map<
          string,
          {
            provider_connection_id: string;
            success: boolean;
            is_processing: boolean;
          }[]
        >();
        for (const r of resultRows ?? []) {
          const arr = resultsByPost.get(r.post_id) ?? [];
          arr.push({
            provider_connection_id: r.provider_connection_id,
            success: r.success,
            is_processing: r.is_processing,
          });
          resultsByPost.set(r.post_id, arr);
        }

        for (const post of posts) {
          const rows = resultsByPost.get(post.id);
          if (!rows?.length) continue;

          const accountPlatform = new Map(
            (post.social_accounts ?? []).map((a) => [a.id, a.platform]),
          );

          const status: Record<string, "success" | "failed" | "processing"> =
            {};
          for (const r of rows) {
            const platform = accountPlatform.get(r.provider_connection_id);
            if (!platform) continue;
            if (status[platform] === "failed") continue;

            const next = r.is_processing
              ? "processing"
              : r.success
                ? "success"
                : "failed";
            if (next === "failed" || status[platform] === undefined) {
              status[platform] = next;
            } else if (next === "processing" && status[platform] === "success") {
              status[platform] = next;
            }
          }
          post.provider_status = status;
        }
      }

      const totalPages = Math.ceil((postsData.meta?.total || 0) / limit);

      return data({
        success: true,
        posts,
        totalCount: postsData.meta?.total || 0,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        projectId,
      });
    } catch (error) {
      console.error("Error fetching posts:", error);

      return data({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        posts: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        projectId,
      });
    }
  })
);
