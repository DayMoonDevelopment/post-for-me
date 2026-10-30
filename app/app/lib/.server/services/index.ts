import { createContext } from "react-router";

import type { TypedSupabaseClient } from "~/lib/.server/supabase";

import type { ApiKeysService } from "./api-keys.service";
import type { AuthService, SessionUser } from "./auth.service";
import type { FileStorageService } from "./file-storage";
import type { ProjectsService } from "./projects.service";
import type { ProviderCredentialsService } from "./provider-credentials.service";
import type { TeamsService } from "./teams.service";
import type { UsersService } from "./users.service";

import { createUnkeyApiKeysService } from "./api-keys.unkey";
import { createSupabaseAuthService } from "./auth.supabase";
import { createFileStorageService } from "./file-storage";
import { createSupabaseProjectsService } from "./projects.supabase";
import { createSupabaseProviderCredentialsService } from "./provider-credentials.supabase";
import { createSupabaseTeamsService } from "./teams.supabase";
import { createSupabaseUsersService } from "./users.supabase";

/**
 * The per-request service registry — one bag of entity ports, published once
 * by the root middleware via {@link servicesContext} and read by any
 * loader/action that needs it.
 *
 * Services are lazy getters: a port is constructed only on first access, so a
 * route that never touches `projects` never builds it. That gives the
 * "pay only for what you use" property without a context per entity or any
 * per-route provisioning to forget.
 */
export interface Services {
  readonly apiKeys: ApiKeysService;
  readonly auth: AuthService;
  readonly fileStorage: FileStorageService;
  readonly projects: ProjectsService;
  readonly providerCredentials: ProviderCredentialsService;
  readonly teams: TeamsService;
  readonly users: UsersService;
}

export const servicesContext = createContext<Services>();

/**
 * The authenticated principal for this request, published by the `_protected`
 * middleware once it has gated access. Loaders/actions under `_protected` read
 * this instead of re-deriving the user — the middleware is the single auth
 * gate, so downstream code consumes the result rather than repeating the check.
 */
export const currentUserContext = createContext<SessionUser>();

/**
 * Build the Supabase-backed registry bound to this request's client.
 *
 * To migrate an entity to the native API, swap its adapter here (e.g.
 * `createApiTeamsService(api)`) — nothing else changes, and backends can be
 * mixed during a gradual, entity-by-entity migration.
 */
export function createServices(supabase: TypedSupabaseClient): Services {
  let auth: AuthService | undefined;
  let users: UsersService | undefined;
  let teams: TeamsService | undefined;
  let projects: ProjectsService | undefined;
  let providerCredentials: ProviderCredentialsService | undefined;
  let fileStorage: FileStorageService | undefined;
  let apiKeys: ApiKeysService | undefined;
  return {
    get auth() {
      return (auth ??= createSupabaseAuthService(supabase));
    },
    get users() {
      return (users ??= createSupabaseUsersService(supabase));
    },
    get teams() {
      return (teams ??= createSupabaseTeamsService(supabase));
    },
    get projects() {
      return (projects ??= createSupabaseProjectsService(supabase));
    },
    get providerCredentials() {
      return (providerCredentials ??=
        createSupabaseProviderCredentialsService(supabase));
    },
    get fileStorage() {
      // Provider-agnostic + service-role internally, so it doesn't ride the
      // request's RLS client the way the other adapters do.
      return (fileStorage ??= createFileStorageService());
    },
    get apiKeys() {
      // Provider-backed (Unkey), not Supabase — no request client needed.
      return (apiKeys ??= createUnkeyApiKeysService());
    },
  };
}
