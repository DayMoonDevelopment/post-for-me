import type {
  SocialPost,
  SocialPostDetail,
  SocialPostListParams,
  SocialPostListResult,
} from "~/lib/types/social-post";

/**
 * Reads a project's social posts and the accounts each one targets. Returns
 * app-native {@link SocialPost} / {@link SocialPostDetail} DTOs; the detail page's
 * per-account outcomes come from the post's results.
 *
 * Read-only for now — posts are authored through the API / playground (PFM-696),
 * not this surface; mutating ops (delete/retry) land with those verticals.
 */
export interface SocialPostsService {
  /** A single post with media + per-account results (identity + outcome +
   * resolved cascade overrides), for the detail page. Throws if not
   * found/accessible. */
  get(id: string): Promise<SocialPostDetail>;
  /** A server-driven page of a project's posts: exact-match platform/status/
   * external-id/social-account filters plus offset pagination all happen in the
   * query. The list carries each post's targeted accounts as identity only — the
   * list endpoint has no per-account result. */
  list(
    projectId: string,
    params?: SocialPostListParams,
  ): Promise<SocialPostListResult>;
}
