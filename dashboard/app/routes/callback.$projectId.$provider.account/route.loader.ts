import { redirect } from "react-router";
import { addSocialAccountConnections } from "~/lib/.server/social-accounts/social-account";
import { withSupabase } from "~/lib/.server/supabase";

export const loader = withSupabase(async function ({
  supabase,
  supabaseServiceRole,
  params,
  request,
}) {
  const user = await supabase.auth.getUser();
  const isLoggedIn = !user.error && user.data != null;

  const { projectId, provider } = params;

  if (!projectId || !provider) {
    return createResponse({
      isSuccess: false,
      error: "Something went wrong",
      isLoggedIn,
    });
  }

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
      `
    )
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error("Project not found");
    return createResponse({
      isSuccess: false,
      error: "Something went wrong",
      projectId,
      provider,
      isLoggedIn,
    });
  }

  const providerAppCredentials = project.social_provider_app_credentials.find(
    (appCredential) => appCredential.provider === provider
  );

  if (!providerAppCredentials && provider !== "bluesky") {
    console.error("Provider app credentials not found for project");
    return createResponse({
      projectId,
      provider,
      teamId: project.team_id,
      isSuccess: false,
      error: "No App Credentials set",
      callbackUrl: project.auth_callback_url,
      isLoggedIn,
    });
  }

  const accounts = await addSocialAccountConnections({
    projectId,
    provider,
    request,
    supabaseServiceRole,
    isSystem: project.is_system,
    appCredentials: {
      appId: providerAppCredentials?.app_id,
      appSecret: providerAppCredentials?.app_secret,
    },
  });

  if (!accounts || accounts.length === 0) {
    return createResponse({
      isSuccess: false,
      error: "Something went wrong",
      teamId: project.team_id,
      projectId,
      provider,
      callbackUrl: project.auth_callback_url,
      isLoggedIn,
    });
  }

  return createResponse({
    isSuccess: true,
    teamId: project.team_id,
    projectId,
    provider,
    accountIds: accounts.map((account) => account.id),
    callbackUrl: project.auth_callback_url,
    isLoggedIn,
  });
});

//Either return to component or redirect to project callback url
const createResponse = ({
  teamId,
  projectId,
  provider,
  isSuccess,
  error,
  callbackUrl,
  accountIds,
  isLoggedIn,
}: {
  teamId?: string;
  projectId?: string;
  provider?: string;
  isSuccess: boolean;
  accountIds?: string[];
  error?: string | null;
  callbackUrl?: string | null | undefined;
  isLoggedIn?: boolean;
}) => {
  if (callbackUrl) {
    const authParams = new URLSearchParams([
      ["provider", provider || ""],
      ["projectId", projectId || ""],
      ["isSuccess", isSuccess ? "true" : "false"],
      ["accountIds", accountIds?.join(",") || ""],
    ]);

    if (error) {
      authParams.append("error", error);
    }

    return redirect(`${callbackUrl}?${authParams.toString()}`);
  }

  return {
    teamId,
    projectId,
    provider,
    isSuccess,
    error,
    isLoggedIn,
  };
};
