import type { SocialPostResultDetail } from "~/lib/types/social-post-result";

/**
 * Reads a single social post **result** (a `social_post_results` row) for the
 * standalone result page: the targeted account, the publish outcome, the
 * account's fully-resolved configuration (cascade collapsed), and the raw
 * provider response. RLS-scoped; read-only.
 */
export interface SocialPostResultsService {
  /** A single result with its account, resolved config, and raw details
   * (RLS-scoped). Throws if not found/accessible. */
  get(id: string): Promise<SocialPostResultDetail>;
}
