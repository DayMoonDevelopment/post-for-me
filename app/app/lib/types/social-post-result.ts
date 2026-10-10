import type {
  PostAccountIdentity,
  PostAccountStatus,
  SocialPostStatus,
} from "~/lib/types/social-post";

/**
 * The cascade layer a resolved field's value came from, after collapsing
 * global → platform → account (account wins platform wins global). Unlike a
 * post's per-account *overrides* (which only surface diffs), a result resolves
 * **every** field and records where each value originated.
 */
export type ConfigSource = "global" | "platform" | "account";

/** One fully-resolved configuration field for an account: the value actually used
 * to publish, plus the layer it resolved from. `field` is `caption`, `media`, or
 * a platform-config key (e.g. `placement`); `value` is display-ready (media is a
 * newline-joined URL list). */
export interface ResolvedConfigField {
  field: string;
  source: ConfigSource;
  value: string;
}

/**
 * One social post **result** — the outcome of publishing a post to a single
 * account (1:1 with a `social_post_results` row). The standalone result page's
 * DTO: the targeted account, the publish outcome (success / error + provider
 * references), the account's fully-resolved configuration (the cascade collapsed,
 * each field tagged with its source), and the raw provider response (`details`,
 * shown as logs). Read-only.
 */
export interface SocialPostResultDetail {
  account: PostAccountIdentity;
  createdAt: string;
  /** The raw provider response / logs (`details` jsonb), rendered verbatim. */
  details: unknown;
  errorMessage: string | null;
  id: string;
  /** The owning post — the back link target (`/social-posts/:postId`). */
  postId: string;
  /** The post's status (the result belongs to a processed post). */
  postStatus: SocialPostStatus;
  /** The owning project — for the sidebar's active project on this flat URL. */
  projectId: string;
  /** The provider's id for the published post, if it published. */
  providerPostId: string | null;
  /** The published post's URL on the platform, if it published. */
  providerPostUrl: string | null;
  /** The account's resolved configuration (every field, with its source). */
  resolved: ResolvedConfigField[];
  /** Derived outcome: `success` → success, otherwise `error`. */
  status: PostAccountStatus;
  success: boolean;
}
