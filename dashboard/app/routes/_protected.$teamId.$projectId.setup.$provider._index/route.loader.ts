import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";

import type { Database } from "~/lib/.server/database.types";

type SocialProviderEnum = Database["public"]["Enums"]["social_provider"];

export const loader = withSupabase(async ({ supabase, params }) => {
  const { teamId, projectId, provider } = params;

  if (!teamId) {
    throw new Error("Team code is required");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  if (!provider) {
    throw new Error("Provider is required");
  }

  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  const [project, credential] = await Promise.all([
    supabase
      .from("projects")
      .select("auth_callback_url")
      .eq("id", projectId)
      .single(),
    supabase
      .from("social_provider_app_credentials")
      .select("provider, project_id, app_id, app_secret")
      .eq("project_id", projectId)
      .eq("provider", provider as SocialProviderEnum)
      .maybeSingle(),
  ]);

  if (project.error) {
    throw new Response("Project not found", { status: 404 });
  }

  // If there's an error other than no rows found, throw it
  if (credential.error) {
    throw new Response("Failed to fetch credentials", { status: 500 });
  }

  const providerCredential = {
    appId: credential?.data?.app_id || "",
    appSecret: credential?.data?.app_secret || "",
  };

  return data({
    provider,
    credential: providerCredential,
    authCallbackUrl: project.data?.auth_callback_url || "",
    setupGuideUrl: `https://www.postforme.dev/resources/getting-started-with-the-${provider}-api`,
    redirectUrl: `https://app.postforme.dev/callback/${projectId}/${provider}/account`,
  });
});
