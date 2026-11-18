import { safeConsole as console } from "~/lib/.server/logging/safe-console";
import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";
import { BskyAgent } from "@atproto/api";

export async function getBlueskySocialProviderConnection({
  request,
  supabaseServiceRole,
  projectId,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const handle = url.searchParams.get("handle");

  if (!handle) {
    throw Error("No handle provided");
  }

  const { data: oauthData } = await supabaseServiceRole
    .from("social_provider_connection_oauth_data")
    .select("*")
    .eq("provider", "bluesky")
    .eq("key_id", handle)
    .eq("key", "app_password")
    .eq("project_id", projectId)
    .single();

  if (!oauthData) {
    throw Error("No app password found");
  }

  const agent = new BskyAgent({
    service: "https://bsky.social", // Using the PDS URL as per docs
  });

  try {
    await agent.login({
      identifier: handle,
      password: oauthData.value,
    });
  } catch (error) {
    console.error(error);
    throw error;
  }

  if (!agent.session) {
    throw new Error("No session established after login");
  }

  const profile = await agent.getProfile({ actor: handle });

  return [
    {
      social_provider_user_id: profile.data.did,
      social_provider_user_name: profile.data.handle,
      social_provider_photo_url: profile.data.avatar,
      access_token: agent.session.accessJwt,
      refresh_token: agent.session.refreshJwt,
      social_provider_metadata: {
        bluesky_app_password: oauthData.value,
      },
      access_token_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  ];
}
