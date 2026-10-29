import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";
import { TwitterApi } from "twitter-api-v2";

export async function getXOAuth2SocialProviderConnection({
  request,
  redirectUri,
  appCredentials,
  supabaseServiceRole,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    throw Error("No valid auth parameters provided");
  }

  const { data: oauthData } = await supabaseServiceRole
    .from("social_provider_connection_oauth_data")
    .select("*")
    .eq("provider", "x")
    .eq("key", "code_verifier")
    .eq("key_id", state)
    .single();

  if (!oauthData?.value) {
    throw Error("No code verifier found for auth attempt");
  }

  const client = new TwitterApi({
    clientId: appCredentials.appId!,
    clientSecret: appCredentials.appSecret!,
  });

  const {
    client: loggedClient,
    accessToken,
    refreshToken,
    expiresIn,
  } = await client.loginWithOAuth2({
    code,
    codeVerifier: oauthData.value,
    redirectUri,
  });

  const { data: user } = await loggedClient.v2.me({
    "user.fields": "profile_image_url,subscription_type,verified_type",
  });

  const isPremium = user.verified_type ? user.verified_type !== "none" : false;

  return [
    {
      access_token: accessToken,
      refresh_token: refreshToken,
      social_provider_user_id: user.id,
      social_provider_user_name: user.username,
      social_provider_photo_url: user.profile_image_url?.replace(
        /_normal(?=\.\w+$)/,
        "",
      ),
      access_token_expires_at: new Date(Date.now() + expiresIn * 1000),
      social_provider_metadata: {
        connection_type: "oauth2",
        has_platform_premium: isPremium,
        verified_type: user.verified_type ?? "none",
        display_name: user.name,
      },
    },
  ];
}
