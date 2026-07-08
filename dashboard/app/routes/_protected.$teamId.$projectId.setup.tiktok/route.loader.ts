import { data } from "react-router";

import { withSupabase } from "~/lib/.server/supabase";

import type { Database } from "~/lib/.server/database.types";
import { MEDIA_BUCKET } from "~/lib/.server/media.constants";

type SocialProviderEnum = Database["public"]["Enums"]["social_provider"];

export const loader = withSupabase(async ({ supabase, params }) => {
  const { teamId, projectId } = params;
  const provider = "tiktok";

  if (!teamId) {
    throw new Error("Team code is required");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const [credential, verificationFiles] = await Promise.all([
    supabase
      .from("social_provider_app_credentials")
      .select("provider, project_id, app_id, app_secret")
      .eq("project_id", projectId)
      .eq("provider", provider as SocialProviderEnum)
      .maybeSingle(),
    supabase
      .from("v_tiktok_verification_files")
      .select("*")
      .eq("project_id", projectId),
  ]);

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
    setupGuideUrl: `https://www.postforme.dev/resources/getting-started-with-the-tiktok-api`,
    redirectUrl: `https://app.postforme.dev/callback/${projectId}/tiktok/account`,
    callbackUrl: `https://app.postforme.dev/callback/`,
    dataUrl: `https://data.postforme.dev/storage/v1/object/public/${MEDIA_BUCKET}/`,
    verificationFiles: verificationFiles.data || [],
  });
});
