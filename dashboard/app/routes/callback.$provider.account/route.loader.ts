import { addSocialAccountConnections } from "~/lib/.server/social-accounts/social-account";
import { withSupabase } from "~/lib/.server/supabase";
import type { Database } from "~/lib/.server/database.types";
import {
  parseOauthCallbackError,
  createOauthCallbackResponse,
} from "~/lib/.server/social-accounts/oauth-callback-response";

type SocialProviderEnum = Database["public"]["Enums"]["social_provider"];

export const loader = withSupabase(async function ({
  supabase,
  supabaseServiceRole,
  params,
  request,
}) {
  const user = await supabase.auth.getUser();
  const isLoggedIn = !user.error && user.data != null;
  const url = new URL(request.url);

  let { provider } = params;

  const { oauthErrorMessage } = parseOauthCallbackError(url, provider);

  const key =
    (url.searchParams.get("oauth_token") as string) ||
    (url.searchParams.get("state") as string);

  if (!key) {
    return createOauthCallbackResponse({
      isSuccess: false,
      errors: [oauthErrorMessage || "Auth state not set"],
      isLoggedIn,
    });
  }

  const oauthData = await supabaseServiceRole
    .from("social_provider_connection_oauth_data")
    .select("*")
    .in("key", ["project", "external_id", "connection_type", "redirect_url"])
    .eq("key_id", key)
    .eq("provider", provider as SocialProviderEnum);

  const projectId = oauthData.data?.find(
    (d) => d.key === "project",
  )?.project_id;

  const externalId = oauthData.data?.find(
    (d) => d.key === "external_id",
  )?.value;

  const redirectUrlOverride = oauthData.data?.find(
    (d) => d.key === "redirect_url",
  )?.value;

  if (!projectId || !provider) {
    return createOauthCallbackResponse({
      isSuccess: false,
      errors: [oauthErrorMessage || "Project Id or Provider not found"],
      isLoggedIn,
    });
  }

  const normalizedProvider =
    provider === "instagram_w_facebook"
      ? "instagram"
      : provider === "x_oauth2"
        ? "x"
        : provider;

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
    console.error("Project not found");
    return createOauthCallbackResponse({
      isSuccess: false,
      errors: [oauthErrorMessage || "Project not found"],
      projectId,
      provider: normalizedProvider,
      isLoggedIn,
    });
  }

  if (oauthErrorMessage) {
    return createOauthCallbackResponse({
      isSuccess: false,
      teamId: project.team_id,
      projectId,
      provider: normalizedProvider,
      callbackUrl: project.auth_callback_url,
      errors: [oauthErrorMessage],
      isLoggedIn,
    });
  }

  const connectionType = oauthData.data?.find(
    (d) => d.key === "connection_type",
  )?.value;
  if (
    connectionType &&
    provider === "instagram" &&
    connectionType === "facebook"
  ) {
    provider = "instagram_w_facebook";
  }

  if (provider === "x" && connectionType === "oauth2") {
    provider = "x_oauth2";
  }

  const providerAppCredentials = project.social_provider_app_credentials.find(
    (appCredential) => appCredential.provider === provider,
  );

  if (!providerAppCredentials && provider !== "bluesky") {
    console.error("Provider app credentials not found for project");
    return createOauthCallbackResponse({
      projectId,
      provider: normalizedProvider,
      teamId: project.team_id,
      isSuccess: false,
      errors: ["No App Credentials set"],
      callbackUrl: project.auth_callback_url,
      isLoggedIn,
    });
  }

  try {
    const accountConnections = await addSocialAccountConnections({
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

    const { successConnections, failedConnections, errors } =
      accountConnections;

    if (successConnections.length === 0) {
      errors.push("No valid accounts found");
      return createOauthCallbackResponse({
        isSuccess: false,
        teamId: project.team_id,
        projectId,
        provider: normalizedProvider,
        callbackUrl: project.auth_callback_url,
        errors,
        failedAccountIds: failedConnections,
        isLoggedIn,
      });
    }

    return createOauthCallbackResponse({
      isSuccess: true,
      teamId: project.team_id,
      projectId,
      provider: normalizedProvider,
      accountIds: successConnections,
      failedAccountIds: failedConnections,
      errors,
      callbackUrl: project.auth_callback_url,
      isLoggedIn,
    });
  } catch (error) {
    console.error(error);
    return createOauthCallbackResponse({
      isSuccess: false,
      errors: [
        (error as { message?: string })?.message ||
          "Internal Error: Something went wrong",
      ],
      teamId: project.team_id,
      projectId,
      provider: normalizedProvider,
      callbackUrl: project.auth_callback_url,
      isLoggedIn,
    });
  }
});
