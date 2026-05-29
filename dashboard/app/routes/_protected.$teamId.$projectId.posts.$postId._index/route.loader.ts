import { data } from "react-router";

import { withDashboardKey } from "~/lib/.server/api/api";
import { withSupabase } from "~/lib/.server/supabase";
import { API_URL } from "~/lib/.server/api/api.constants";

import type { Post, PostResult, PostResultAccount } from "./types";

export const loader = withSupabase(
  withDashboardKey(async ({ apiKey, params, supabase }) => {
    const postId = params.postId;

    // Fetch post data
    const postResponse = await fetch(`${API_URL}/v1/social-posts/${postId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!postResponse.ok) {
      throw new Response("Post not found", { status: 404 });
    }

    const post: Post = await postResponse.json();

    // If post is completed, fetch results
    let results: PostResult[] = [];
    if (post.status === "posted" || post.status === "processed") {
      const resultsReq = await fetch(
        `${API_URL}/v1/social-post-results?post_id=${postId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (resultsReq.ok) {
        const resultsRes = await resultsReq.json();

        results = resultsRes?.data || [];
      }

      // Enrich each result with the social account it was posted to, so the UI
      // can show platform + handle instead of an opaque account id.
      const accountIds = [
        ...new Set(results.map((r) => r.social_account_id).filter(Boolean)),
      ];

      if (accountIds.length > 0) {
        const { data: connections } = await supabase
          .from("social_provider_connections")
          .select(
            "id, provider, social_provider_user_name, social_provider_profile_photo_url",
          )
          .in("id", accountIds);

        const accountMap = new Map<string, PostResultAccount>(
          (connections ?? []).map((c) => [
            c.id,
            {
              id: c.id,
              provider: c.provider,
              username: c.social_provider_user_name,
              profile_photo_url: c.social_provider_profile_photo_url,
            },
          ]),
        );

        results = results.map((r) => ({
          ...r,
          account: accountMap.get(r.social_account_id) ?? null,
        }));
      }
    }

    return data({
      post,
      results,
    });
  })
);
