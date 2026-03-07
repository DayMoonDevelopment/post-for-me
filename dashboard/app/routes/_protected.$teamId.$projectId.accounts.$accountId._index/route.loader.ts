import { data } from "react-router";
import { withSupabase } from "~/lib/.server/supabase";
import { withDashboardKey } from "~/lib/.server/api/api";
import { API_URL } from "~/lib/.server/api/api.constants";

export const loader = withSupabase(
  withDashboardKey(async ({ supabase, params, request, apiKey }) => {
    const { teamId, projectId, accountId } = params;
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (!teamId || !projectId || !accountId) {
      throw new Error("Team ID, Project ID, and Account ID are required");
    }

    if (!apiKey) {
      return data({
        success: false,
        posts: [],
        meta: { limit, has_more: false },
        accountInfo: undefined,
        error: "API key not available",
      });
    }

    // Get account info from Supabase
    const { data: accountData, error: accountError } = await supabase
      .from("social_provider_connections")
      .select("id, provider, social_provider_user_name, external_id")
      .eq("id", accountId)
      .eq("project_id", projectId)
      .single();

    if (accountError || !accountData) {
      return data({
        success: false,
        posts: [],
        meta: { limit, has_more: false },
        accountInfo: undefined,
        error: "Account not found",
      });
    }

    const isYouTube = accountData.provider === "youtube";

    // Fetch posts from API
    try {
      const apiUrl = new URL(
        `/v1/social-account-feeds/${accountId}?expand=metrics`,
        API_URL,
      );
      if (cursor) {
        apiUrl.searchParams.set("cursor", cursor);
      }
      apiUrl.searchParams.set("limit", limit.toString());

      const response = await fetch(apiUrl.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      let posts = result.data || [];
      let meta = (result.meta || { limit, has_more: false }) as {
        limit: number;
        has_more: boolean;
        cursor?: string;
        next?: string | null;
      };

      if (isYouTube) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);

        const filteredPosts = posts.filter((p: { posted_at?: string }) => {
          const postedAt = p.posted_at;
          if (!postedAt) return false;
          const d = new Date(postedAt);
          if (Number.isNaN(d.getTime())) return false;
          return d >= cutoff;
        });

        // If we had to filter anything out, all subsequent pages will be older.
        if (
          filteredPosts.length === 0 ||
          filteredPosts.length !== posts.length
        ) {
          meta = { ...meta, has_more: false };
        }

        posts = filteredPosts;
      }

      return data({
        success: true,
        posts,
        meta,
        accountInfo: {
          id: accountData.id,
          provider: accountData.provider,
          username: accountData.social_provider_user_name || undefined,
          external_id: accountData.external_id || undefined,
        },
      });
    } catch (error) {
      console.error("Error fetching social account feed:", error);
      return data({
        success: false,
        posts: [],
        meta: { limit, has_more: false },
        accountInfo: {
          id: accountData.id,
          provider: accountData.provider,
          username: accountData.social_provider_user_name || undefined,
          external_id: accountData.external_id || undefined,
        },
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch account feed",
      });
    }
  }),
);
