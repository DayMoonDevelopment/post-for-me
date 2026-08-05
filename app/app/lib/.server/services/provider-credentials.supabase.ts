import type { TypedSupabaseClient } from "~/lib/.server/supabase";
import type { Database } from "~/lib/.server/supabase.types";

import { fromSupabase } from "~/lib/.server/errors";
import { createSupabaseServiceRoleClient } from "~/lib/.server/supabase";
import {
  isSocialProvider,
  ONBOARDING_PLATFORMS,
  type SocialProvider,
} from "~/lib/onboarding";

import type {
  ProviderCredential,
  ProviderCredentialsService,
  ProviderCredentialStatus,
} from "./provider-credentials.service";

// The app's `SocialProvider` union matches the DB `social_provider` enum, so the
// casts at the read/write boundary are safe.
type DbSocialProvider = Database["public"]["Enums"]["social_provider"];

/**
 * Supabase-backed {@link ProviderCredentialsService}.
 *
 * White-label rows live in `social_provider_app_credentials`, keyed by the
 * composite `(provider, project_id)` primary key — so a re-submit updates in
 * place rather than erroring or duplicating. The platform universe comes from
 * the global `system_social_provider_app_credentials` table (the providers Post
 * for Me has shared keys for). `SocialProvider` IS the `social_provider` enum,
 * so the casts at the boundary are safe.
 *
 * SYSTEM (Quickstart) PROJECTS. `20250807160031_rls_for_system_credentials.sql`
 * gates every policy on `social_provider_app_credentials` with
 * `AND NOT is_system_project(project_id)`, so the user-scoped client can neither
 * read nor write a Quickstart project's rows — a plain select returns nothing
 * and an insert fails with 42501. Those projects still HAVE rows: enabling a
 * platform copies Post for Me's shared keys from
 * `system_social_provider_app_credentials` onto the project, which only the
 * service-role client can do. So the reads and writes below pick their client by
 * project type, and the secret values never leave this module for a system
 * project (callers get provider names, or rows the caller already owns).
 */
export function createSupabaseProviderCredentialsService(
  supabase: TypedSupabaseClient,
): ProviderCredentialsService {
  /** Whether the project rides Post for Me's shared credentials. Read through
   * the USER client, so it doubles as the access check that gates every
   * service-role write below. */
  async function isSystemProject(projectId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("projects")
      .select("is_system")
      .eq("id", projectId)
      .single();
    if (error) throw fromSupabase(error);
    return Boolean(data.is_system);
  }

  /**
   * Provider NAMES only — the query selects NO credential column, which is
   * precisely what makes it safe to run through the service-role client for a
   * system project (whose rows the user client can't see at all). Declared as a
   * function rather than reached through `this`, so destructuring the service
   * can't quietly break it.
   */
  async function enabledProviders(projectId: string): Promise<SocialProvider[]> {
    const client = (await isSystemProject(projectId))
      ? createSupabaseServiceRoleClient()
      : supabase;
    const { data, error } = await client
      .from("social_provider_app_credentials")
      // ⚠️ SECURITY-CRITICAL PROJECTION. This is the ONLY elevated read of a
      // system project's credential rows, and those rows contain Post for Me's
      // shared app id + secret. `provider` is the entire safe surface — adding
      // ANY other column here hands the client the shared credentials, because
      // this feeds the settings loader. Need more? Add it to the white-label
      // branch of `listCredentialStatuses`, never to this select.
      .select("provider")
      .eq("project_id", projectId);
    if (error) throw fromSupabase(error);
    return data.map((row) => row.provider).filter(isSocialProvider);
  }

  return {
    async list(projectId): Promise<ProviderCredential[]> {
      // Explicit refusal rather than relying on RLS to quietly return nothing.
      // A system project's row holds Post for Me's SHARED keys (copied in by
      // `enableFromSystem`), so a caller that reaches here for one is a bug —
      // and today's safety would otherwise rest on this happening to use the
      // user client. Fail loudly if that ever changes.
      if (await isSystemProject(projectId)) {
        throw new Error(
          "provider-credentials: refusing to read credential VALUES for a system (Quickstart) project — those are Post for Me's shared keys. Use listCredentialStatuses().",
        );
      }

      const { data, error } = await supabase
        .from("social_provider_app_credentials")
        .select("provider, app_id, app_secret")
        .eq("project_id", projectId);
      if (error) throw fromSupabase(error);
      return data
        .filter((row) => isSocialProvider(row.provider))
        .map((row) => ({
          provider: row.provider as SocialProvider,
          appId: row.app_id ?? "",
          appSecret: row.app_secret ?? "",
        }));
    },

    async getCredential(projectId, provider): Promise<ProviderCredential | null> {
      // Hard stop before any read: a system project's credentials are Post for
      // Me's shared keys, and there is no caller — authorized or not — that may
      // receive them.
      if (await isSystemProject(projectId)) return null;

      const { data, error } = await supabase
        .from("social_provider_app_credentials")
        .select("provider, app_id, app_secret")
        .eq("project_id", projectId)
        .eq("provider", provider as DbSocialProvider)
        .maybeSingle();
      if (error) throw fromSupabase(error);
      if (!data) return null;
      return {
        provider: data.provider as SocialProvider,
        appId: data.app_id ?? "",
        appSecret: data.app_secret ?? "",
      };
    },

    async listCredentialStatuses(projectId): Promise<ProviderCredentialStatus[]> {
      // System project: provider NAMES only, exactly as `listEnabledProviders`
      // does — the secret columns are never selected, so there is nothing to
      // leak even by accident. A row exists only because enabling copied the
      // shared credentials in, so presence IS completeness.
      if (await isSystemProject(projectId)) {
        const providers = await enabledProviders(projectId);
        return providers.map((provider) => ({
          provider,
          hasAppId: true,
          hasAppSecret: true,
        }));
      }

      // White-label: the values are read, but they stop here — only booleans
      // cross back out of this function.
      const { data, error } = await supabase
        .from("social_provider_app_credentials")
        .select("provider, app_id, app_secret")
        .eq("project_id", projectId);
      if (error) throw fromSupabase(error);
      return data
        .filter((row) => isSocialProvider(row.provider))
        .map((row) => ({
          provider: row.provider as SocialProvider,
          hasAppId: Boolean(row.app_id?.trim()),
          hasAppSecret: Boolean(row.app_secret?.trim()),
        }));
    },

    listEnabledProviders: enabledProviders,

    async enableFromSystem(projectId, providers): Promise<SocialProvider[]> {
      if (providers.length === 0) return [];
      const serviceRole = createSupabaseServiceRoleClient();
      // Only providers Post for Me actually holds shared keys for can be
      // enabled; the rest come back to the caller so it can say which.
      const { data: system, error: readError } = await serviceRole
        .from("system_social_provider_app_credentials")
        .select("provider, app_id, app_secret")
        .in("provider", providers as DbSocialProvider[]);
      if (readError) throw fromSupabase(readError);

      const available = new Map(system.map((row) => [row.provider, row]));
      const rows = providers
        .filter((provider) => available.has(provider as DbSocialProvider))
        .map((provider) => {
          const shared = available.get(provider as DbSocialProvider);
          return {
            project_id: projectId,
            provider: provider as DbSocialProvider,
            app_id: shared?.app_id ?? null,
            app_secret: shared?.app_secret ?? null,
          };
        });
      if (rows.length > 0) {
        const { error } = await serviceRole
          .from("social_provider_app_credentials")
          .upsert(rows, { onConflict: "provider,project_id" });
        if (error) throw fromSupabase(error);
      }
      return providers.filter(
        (provider) => !available.has(provider as DbSocialProvider),
      );
    },

    async upsert(projectId, credentials): Promise<void> {
      if (credentials.length === 0) return;
      // The row is written whole (no partial column update in an upsert), so an
      // empty incoming field would blank whatever is stored. Merge onto the
      // current row instead: empty means "leave it alone", letting a member save
      // an app id now and the secret later. Clearing a key is `remove`, not a
      // blank save — which also keeps the keyless rows written by the
      // `platforms` / `platform_config` intents from wiping configured keys.
      const providers = credentials.map((c) => c.provider as DbSocialProvider);
      const { data: existing, error: readError } = await supabase
        .from("social_provider_app_credentials")
        .select("provider, app_id, app_secret")
        .eq("project_id", projectId)
        .in("provider", providers);
      if (readError) throw fromSupabase(readError);
      const stored = new Map(existing.map((row) => [row.provider, row]));
      const rows = credentials.map((credential) => {
        const prior = stored.get(credential.provider as DbSocialProvider);
        return {
          project_id: projectId,
          provider: credential.provider as DbSocialProvider,
          app_id: credential.appId || (prior?.app_id ?? ""),
          app_secret: credential.appSecret || (prior?.app_secret ?? ""),
        };
      });
      const { error } = await supabase
        .from("social_provider_app_credentials")
        .upsert(rows, { onConflict: "provider,project_id" });
      if (error) throw fromSupabase(error);
    },

    async remove(projectId, providers): Promise<void> {
      if (providers.length === 0) return;
      // A system project's rows are invisible to the user client (the delete
      // would silently match nothing), so disabling goes through service role.
      const client = (await isSystemProject(projectId))
        ? createSupabaseServiceRoleClient()
        : supabase;
      const { error } = await client
        .from("social_provider_app_credentials")
        .delete()
        .eq("project_id", projectId)
        .in("provider", providers as DbSocialProvider[]);
      if (error) throw fromSupabase(error);
    },

    async listSupportedProviders(): Promise<SocialProvider[]> {
      // `system_social_provider_app_credentials` has RLS on with no policies, so
      // the user client reads nothing and this always fell through to the
      // hardcoded fallback below — which can't express whether a CONNECTION
      // METHOD like `tiktok_business` is available. Provider names carry no
      // secret, so read them through service role and get a truthful answer.
      const { data, error } = await createSupabaseServiceRoleClient()
        .from("system_social_provider_app_credentials")
        .select("provider");
      // Still fall back to the app's base platform set if the table is empty
      // (a fresh sandbox), so the picker is never empty.
      if (error || !data || data.length === 0) {
        return [...ONBOARDING_PLATFORMS];
      }
      const supported = data.map((row) => row.provider).filter(isSocialProvider);
      return supported.length > 0 ? supported : [...ONBOARDING_PLATFORMS];
    },
  };
}
