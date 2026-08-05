import { redirect, type RouterContextProvider } from "react-router";

import type { Database } from "~/lib/.server/supabase.types";
import type { ConnectionResultData } from "~/lib/types/connection-result";

import { logError } from "~/lib/.server/errors";
import { servicesContext } from "~/lib/.server/services";
import { createSupabaseServiceRoleClient } from "~/lib/.server/supabase";

import { addSocialAccountConnections, readConnectionsForDisplay } from "./connections";

type SocialProviderEnum = Database["public"]["Enums"]["social_provider"];

/**
 * The shared OAuth-callback op for BOTH connect flows (2 consumers → lifted here
 * per the routes README). The two public callback routes are thin adapters over
 * this; they differ only in how the project is identified.
 *
 * - **White Label** (`/callback/$projectId/$provider/account`): the project id is
 *   in the URL, so we trust the path and scope the `oauth_data` lookup to it.
 * - **Quickstart** (`/callback/$provider/account`): the project id is NOT in the
 *   URL — it's recovered from the `social_provider_connection_oauth_data` row the
 *   API stashed under the OAuth `state`.
 *
 * DATA FLOW (unchanged from the legacy dashboard, translated to v2 services):
 *   1. Read the anti-forgery key off the query — `oauth_token` for X (OAuth 1.0a),
 *      `state` for everyone else.
 *   2. Look it up in `social_provider_connection_oauth_data` (service-role) to
 *      recover `project` (QS only), `external_id`, `connection_type`, and any
 *      `redirect_url` override. A missing/unknown key can't be forged → failure.
 *   3. Load the project (`auth_callback_url`, `team_id`, `is_system`, per-provider
 *      app credentials).
 *   4. Exchange the code/verifier and upsert the connection rows
 *      ({@link addSocialAccountConnections}).
 *   5. Terminate exactly as legacy:
 *      - if the project configured `auth_callback_url` → 302 to the CUSTOMER's own
 *        callback with the plain-param contract (unchanged);
 *      - otherwise → RETURN {@link ConnectionResultData} for this route's own
 *        branded fallback component.
 *
 * The branded data is produced ONLY here, as the output of a genuine `state`-gated
 * exchange — so someone hitting the callback URL by hand (no valid key) falls
 * through to the failure result rather than seeing any account. App credentials
 * are used only for the server-side exchange and never leave this module; the
 * returned account facts carry NO ids or tokens.
 */
export async function handleConnectionCallback({
  request,
  context,
  projectIdFromPath,
  provider: providerParam,
}: {
  context: Readonly<RouterContextProvider>;
  /** The path `$projectId` for White Label; `null` for Quickstart. */
  projectIdFromPath: string | null;
  provider: string | undefined;
  request: Request;
}): Promise<Response | ConnectionResultData> {
  const supabaseServiceRole = createSupabaseServiceRoleClient();
  const url = new URL(request.url);

  let provider = providerParam;

  const finalize = (args: {
    accountIds?: string[];
    callbackUrl?: string | null;
    errors?: string[];
    failedAccountIds?: string[];
    ok: boolean;
    projectId?: string;
    provider?: string;
  }) =>
    finalizeCallback({ context, supabaseServiceRole, ...args });

  // White Label requires a project in the path; both flows require a provider.
  const isWhiteLabel = projectIdFromPath !== null;
  if (!provider || (isWhiteLabel && !projectIdFromPath)) {
    return finalize({ ok: false, errors: ["Project Id or Provider not found"] });
  }

  // X (OAuth 1.0a) returns `oauth_token`; everyone else carries our `state`.
  const key =
    provider.toLowerCase() === "x"
      ? url.searchParams.get("oauth_token")
      : url.searchParams.get("state");

  if (!key) {
    return finalize({ ok: false, errors: ["Auth state not set"] });
  }

  // Quickstart also needs the `project` row to learn which project this is.
  const oauthDataKeys = isWhiteLabel
    ? ["external_id", "connection_type", "redirect_url"]
    : ["project", "external_id", "connection_type", "redirect_url"];

  let oauthQuery = supabaseServiceRole
    .from("social_provider_connection_oauth_data")
    .select("*")
    .eq("key_id", key)
    .in("key", oauthDataKeys)
    .eq("provider", provider as SocialProviderEnum);

  // White Label scopes the lookup to its known project; Quickstart can't yet.
  if (isWhiteLabel) {
    oauthQuery = oauthQuery.eq("project_id", projectIdFromPath);
  }

  const oauthData = await oauthQuery;

  const projectId = isWhiteLabel
    ? projectIdFromPath
    : oauthData.data?.find((d) => d.key === "project")?.project_id;

  const externalId = oauthData.data?.find(
    (d) => d.key === "external_id",
  )?.value;

  const connectionType = oauthData.data?.find(
    (d) => d.key === "connection_type",
  )?.value;

  const redirectUrlOverride = oauthData.data?.find(
    (d) => d.key === "redirect_url",
  )?.value;

  if (!projectId || !provider) {
    return finalize({ ok: false, errors: ["Project Id or Provider not found"] });
  }

  if (
    connectionType &&
    provider === "instagram" &&
    connectionType === "facebook"
  ) {
    provider = "instagram_w_facebook";
  }

  const normalizedProvider =
    provider === "instagram_w_facebook" ? "instagram" : provider;

  const { data: project, error: projectError } = await supabaseServiceRole
    .from("projects")
    .select(
      `
        auth_callback_url,
        team_id,
        is_system,
        social_provider_app_credentials(
          provider,
          app_id,
          app_secret
        )
      `,
    )
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    logError(new Error("OAuth callback: project not found"), {
      projectId,
      provider: normalizedProvider,
      surface: "handleConnectionCallback",
    });
    return finalize({
      ok: false,
      projectId,
      provider: normalizedProvider,
      errors: ["Project not found"],
    });
  }

  const providerAppCredentials = project.social_provider_app_credentials.find(
    (appCredential) => appCredential.provider === provider,
  );

  if (!providerAppCredentials && provider !== "bluesky") {
    logError(new Error("OAuth callback: no app credentials for provider"), {
      projectId,
      provider: normalizedProvider,
      surface: "handleConnectionCallback",
    });
    return finalize({
      ok: false,
      projectId,
      provider: normalizedProvider,
      callbackUrl: project.auth_callback_url,
      errors: ["No App Credentials set"],
    });
  }

  try {
    const { successConnections, failedConnections, errors } =
      await addSocialAccountConnections({
        projectId,
        provider,
        request,
        supabaseServiceRole,
        isSystem: project.is_system,
        appCredentials: {
          appId: providerAppCredentials?.app_id,
          appSecret: providerAppCredentials?.app_secret,
        },
        externalId,
        redirectUrlOverride,
      });

    if (successConnections.length === 0) {
      errors.push("No valid accounts found");
      return finalize({
        ok: false,
        projectId,
        provider: normalizedProvider,
        callbackUrl: project.auth_callback_url,
        failedAccountIds: failedConnections,
        errors,
      });
    }

    return finalize({
      ok: true,
      projectId,
      provider: normalizedProvider,
      callbackUrl: project.auth_callback_url,
      accountIds: successConnections,
      failedAccountIds: failedConnections,
      errors,
    });
  } catch (error) {
    logError(error, {
      projectId,
      provider: normalizedProvider,
      surface: "handleConnectionCallback.exchange",
    });
    return finalize({
      ok: false,
      projectId,
      provider: normalizedProvider,
      callbackUrl: project.auth_callback_url,
      errors: [
        (error as { message?: string })?.message ||
          "Internal Error: Something went wrong",
      ],
    });
  }
}

/**
 * Terminate a callback. Two paths:
 *  - a customer-configured `callbackUrl` → 302 with the legacy plain-param
 *    contract (unchanged — that's the customer's own page + trust boundary);
 *  - otherwise → RETURN branded {@link ConnectionResultData} for this route's own
 *    fallback. On success we re-read the just-connected rows for display (avatar /
 *    handle / platform), keeping IDS server-side, and gate the dashboard CTA on
 *    the REAL session + project membership.
 */
async function finalizeCallback({
  context,
  supabaseServiceRole,
  ok,
  projectId = "",
  provider = "",
  callbackUrl,
  accountIds = [],
  failedAccountIds = [],
  errors = [],
}: {
  accountIds?: string[];
  callbackUrl?: string | null;
  context: Readonly<RouterContextProvider>;
  errors?: string[];
  failedAccountIds?: string[];
  ok: boolean;
  projectId?: string;
  provider?: string;
  supabaseServiceRole: ReturnType<typeof createSupabaseServiceRoleClient>;
}): Promise<Response | ConnectionResultData> {
  const error = errors.length > 0 ? errors.join("|") : null;

  if (callbackUrl) {
    const authParams = new URLSearchParams([
      ["provider", provider],
      ["projectId", projectId],
      ["isSuccess", ok ? "true" : "false"],
      ["accountIds", accountIds.join(",")],
    ]);

    if (failedAccountIds.length > 0) {
      authParams.append("failedAccountIds", failedAccountIds.join(","));
    }

    if (error) {
      authParams.append("error", error);
    }

    // MERGE the params rather than appending `?…`. A customer's
    // `auth_callback_url` may already carry a query string, and string
    // concatenation would produce `…?a=1?provider=…` — the second `?` is just a
    // character, so their own params silently fold into one corrupt value.
    // The column is validated as an absolute http(s) URL on write, but this
    // runs on a public callback, so a parse failure falls back to the branded
    // result page rather than throwing.
    try {
      const target = new URL(callbackUrl);
      for (const [key, value] of authParams) {
        target.searchParams.append(key, value);
      }
      return redirect(target.toString());
    } catch {
      logError(new Error("Project auth_callback_url is not a valid URL"), {
        projectId,
        provider,
        surface: "finalizeCallback",
      });
    }
  }

  // Re-read the just-connected accounts for display — narrowed to non-secret,
  // id-free facts before they leave the server.
  const accounts =
    ok && projectId && accountIds.length > 0
      ? (
          await readConnectionsForDisplay(
            supabaseServiceRole,
            projectId,
            accountIds,
          )
        ).map((account) => ({
          platform: account.platform,
          username: account.username,
          avatarUrl: account.avatarUrl,
          status: account.status,
        }))
      : [];

  // Dashboard CTA is gated on the REAL session + membership (RLS), not on
  // anything derived from the OAuth return.
  const services = context.get(servicesContext);
  const user = await services.auth.currentUser();
  let canOpenDashboard = false;
  if (user && projectId) {
    const projects = await services.projects.list();
    canOpenDashboard = projects.some((p) => p.id === projectId);
  }

  return {
    isSuccess: ok,
    provider,
    accounts,
    errorMessages: errors,
    failedCount: failedAccountIds.length,
    canOpenDashboard,
    dashboardHref: canOpenDashboard
      ? `/projects/${projectId}/social-accounts`
      : null,
  };
}
