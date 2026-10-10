import type {
  ProviderCredentialStatus,
  SocialProvider,
} from "~/lib/onboarding";

export type { ProviderCredentialStatus };

/** One provider's developer app credentials for a project. */
export interface ProviderCredential {
  appId: string;
  appSecret: string;
  provider: SocialProvider;
}

export interface ProviderCredentialsService {
  /**
   * Enable providers on a SYSTEM (Quickstart) project by copying Post for Me's
   * shared keys from `system_social_provider_app_credentials` onto the project's
   * own rows — the only way those rows can exist, since RLS denies the user
   * client every operation on a system project's credentials.
   *
   * Returns the requested providers that could NOT be enabled because Post for
   * Me holds no shared credential for them, so the caller can report which.
   * White-label projects use {@link upsert} instead.
   */
  enableFromSystem(
    projectId: string,
    providers: SocialProvider[],
  ): Promise<SocialProvider[]>;
  /**
   * ONE provider's credential values, for the dedicated reveal endpoint.
   *
   * Returns `null` for a system (Quickstart) project no matter what — those
   * keys are Post for Me's, not the member's, and must never leave the server.
   * Callers must still gate on project access; this is the last line, not the
   * only one.
   */
  getCredential(
    projectId: string,
    provider: SocialProvider,
  ): Promise<ProviderCredential | null>;
  /** The project's configured providers + their keys (may be empty strings for
   * a platform added but not yet keyed). Reads the secret columns — server-side
   * / white-label only. NEVER hand its result to a client: page loaders want
   * {@link listCredentialStatuses}, and the reveal endpoint wants
   * {@link getCredential}. */
  list(projectId: string): Promise<ProviderCredential[]>;
  /** Per-provider presence booleans — the client-safe view of the same rows.
   * A system project is reported from provider NAMES only (its shared secrets
   * are never even selected); a white-label project's values are read and
   * reduced to booleans here, inside the server. */
  listCredentialStatuses(projectId: string): Promise<ProviderCredentialStatus[]>;
  /** The providers a project has ENABLED, by name only — the query selects NO
   * credential columns (`app_id`/`app_secret` are never read). This is the
   * secret-free read for surfaces that only need enablement, above all Quickstart
   * projects: their shared SYSTEM secrets must never be fetched into a client
   * payload, so the guarantee is structural (the values aren't even queried). */
  listEnabledProviders(projectId: string): Promise<SocialProvider[]>;
  /** The platform universe a project can configure — the providers Post for Me
   * has system credentials for (`system_social_provider_app_credentials`),
   * intersected with the app's known platforms. */
  listSupportedProviders(): Promise<SocialProvider[]>;
  /** Remove the rows for the given providers (deselecting a platform). An empty
   * list is a no-op. */
  remove(projectId: string, providers: SocialProvider[]): Promise<void>;
  /** Upsert the given credentials for a project, keyed by (provider, project).
   * An empty list is a no-op. An empty `appId`/`appSecret` MERGES — it leaves
   * any stored value in place rather than blanking it — so a caller can save one
   * field at a time. Clearing a platform's keys is {@link remove}. */
  upsert(projectId: string, credentials: ProviderCredential[]): Promise<void>;
}
