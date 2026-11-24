import type { SocialProvider } from "~/lib/onboarding";
import type {
  AccountPost,
  SocialAccount,
  SocialAccountListParams,
  SocialAccountListResult,
  SocialAccountTokenMeta,
  SocialAccountTokens,
} from "~/lib/types/social-account";

/** Inputs to start an OAuth connect flow. `config` is provider-specific and
 * shaped by the connect vertical (PFM-696); left open until that design lands. */
export interface CreateAuthURLInput {
  config?: Record<string, unknown>;
  externalId?: string;
  platform: SocialProvider;
  projectId: string;
}

/**
 * Reads and manages a project's connected social accounts (the
 * `social_provider_connections` rows). Returns app-native {@link SocialAccount}
 * DTOs that **never carry tokens** — `getTokens` is the one explicit seam for
 * the detail page's opt-in reveal.
 */
export interface SocialAccountsService {
  /** Start the OAuth connect flow → a provider redirect URL. Owned by the
   * connect vertical (PFM-696); not implemented until that design lands. */
  createAuthURL(input: CreateAuthURLInput): Promise<{ url: string }>;
  /** Clear the access/refresh tokens but **retain the row + history** — the
   * account then reads as `disconnected`. */
  disconnect(id: string): Promise<void>;
  /** A single account by id (RLS-scoped). Throws if not found/accessible. */
  get(id: string): Promise<SocialAccount>;
  /** NON-SECRET token metadata (expiry instants + a presence boolean per token),
   * safe to fold into the detail loader. Returns NO token strings — the values
   * stay behind `getTokens`. (RLS-scoped.) */
  getTokenMeta(id: string): Promise<SocialAccountTokenMeta>;
  /** The account's access/refresh tokens — explicit, for the detail page's
   * masked reveal only. Never folded into `list`/`get`. */
  getTokens(id: string): Promise<SocialAccountTokens>;
  /** A server-driven page of a project's accounts (RLS-scoped): ILIKE search,
   * platform/status filters, sort, and pagination all happen in the query. */
  list(
    projectId: string,
    params?: SocialAccountListParams,
  ): Promise<SocialAccountListResult>;
  /** Recent posts that target this account (newest first), for the detail page's
   * posts table. Minimal summary only — RLS-scoped. */
  listPostsForAccount(id: string): Promise<AccountPost[]>;
}
