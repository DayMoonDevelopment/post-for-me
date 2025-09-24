import { redirect } from "react-router";
import { withSupabase } from "~/lib/.server/supabase";

export const loader = withSupabase(async function loader({
  supabaseServiceRole,
  params,
}) {
  const { projectId } = params;

  if (!projectId) {
    throw redirect("/dashboard");
  }

  // Get existing app credentials for this project
  const { data: credentials } = await supabaseServiceRole
    .from("social_provider_app_credentials")
    .select("provider, app_secret, app_id")
    .eq("project_id", projectId);

  const enabledProviders = new Set(
    credentials
      ?.filter(
        (cred) =>
          cred.provider &&
          cred.app_id &&
          cred.app_secret &&
          cred.app_id !== "" &&
          cred.app_secret !== ""
      )
      ?.map((cred) => {
        if (cred.provider === "instagram_w_facebook") {
          return "instagram";
        }
        return cred.provider;
      }) || []
  );

  // All available social providers
  const allProviders = [
    "facebook",
    "instagram",
    "x",
    "tiktok",
    "youtube",
    "pinterest",
    "linkedin",
    "bluesky",
    "threads",
    "tiktok_business",
  ] as const;

  const providers = allProviders.map((provider) => ({
    id: provider,
    name: getProviderDisplayName(provider),
    enabled: provider === "bluesky" || enabledProviders.has(provider),
  }));

  return { providers };
});

function getProviderDisplayName(provider: string): string {
  const displayNames: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    x: "X (Twitter)",
    tiktok: "TikTok",
    youtube: "YouTube",
    pinterest: "Pinterest",
    linkedin: "LinkedIn",
    bluesky: "Bluesky",
    threads: "Threads",
    tiktok_business: "TikTok Business",
  };

  return displayNames[provider] || provider;
}
