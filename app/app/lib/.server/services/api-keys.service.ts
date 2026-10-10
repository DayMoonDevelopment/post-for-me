import type { ApiKey, ApiKeyCreator } from "~/lib/types/api-key";

/** Create a key for a project. `name` is optional (renameable later). The key's
 * provider metadata is stamped to match what the API's auth layer reads off a
 * key: `created_by` (user id) + `team_id` + the plan metadata, plus a
 * `created_by_label` snapshot for display. */
export interface CreateApiKeyInput {
  createdBy: ApiKeyCreator;
  name?: string;
  /** Advisory plan metadata (`plan_type`, …) the API resolves from the key. */
  planMeta: Record<string, string>;
  projectId: string;
  teamId: string;
}

export interface RenameApiKeyInput {
  id: string;
  name: string;
  /** Scopes the mutation to the caller's project — the key must belong to it. */
  projectId: string;
}

export interface DeleteApiKeyInput {
  id: string;
  /** Scopes the mutation to the caller's project — the key must belong to it. */
  projectId: string;
}

/**
 * Reads and manages a project's API keys. Returns app-native {@link ApiKey} DTOs
 * — the provider (Unkey) vocabulary stays inside the adapter, so swapping
 * providers is an adapter-only change. Keys are scoped to a project via the
 * provider's `externalId`; nothing is stored in our own DB.
 */
export interface ApiKeysService {
  /** Mint a key; returns the DTO plus the full `secret` (the ONE time it's ever
   * available — the provider only keeps a hash). */
  create(input: CreateApiKeyInput): Promise<{ apiKey: ApiKey; secret: string }>;
  /** Revoke a key. Verifies the key belongs to the project first. */
  delete(input: DeleteApiKeyInput): Promise<void>;
  /** A project's keys (never secrets), newest first. */
  list(projectId: string): Promise<ApiKey[]>;
  /** Rename a key (the provider-native name). Verifies project ownership. */
  rename(input: RenameApiKeyInput): Promise<void>;
}
