import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";
import { TwitterApi } from "twitter-api-v2";

export async function getXSocialProviderConnection({
  request,
  appCredentials,
  supabaseServiceRole,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const oauthToken = url.searchParams.get("oauth_token");
  const oauthVerifier = url.searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    throw Error("No valid auth parameters provided");
  }

  const { data: oauthData } = await supabaseServiceRole
    .from("social_provider_connection_oauth_data")
    .select("*")
    .eq("provider", "x")
    .eq("key", "oauth_token")
    .eq("key_id", oauthToken)
    .single();

  const client = new TwitterApi({
    appKey: appCredentials.appId!,
    appSecret: appCredentials.appSecret!,
    accessToken: oauthToken,
    accessSecret: oauthData?.value,
  });

  const {
    client: loggedClient,
    accessToken,
    accessSecret,
  } = await client.login(oauthVerifier);

  const { data: user } = await loggedClient.v2.me({
    "user.fields": "profile_image_url,subscription_type,verified_type",
  });

  const isPremium = user.verified_type ? user.verified_type !== "none" : false;

  return [
    {
      access_token: accessToken,
      refresh_token: accessSecret,
      social_provider_user_id: user.id,
      social_provider_user_name: user.username,
      social_provider_photo_url: user.profile_image_url?.replace(
        "_normal",
        "",
      ),
      access_token_expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      social_provider_metadata: {
        connection_type: "oauth1",
        has_platform_premium: isPremium,
        verified_type: user.verified_type ?? "none",
        display_name: user.name,
      },
    },
  ];
}
