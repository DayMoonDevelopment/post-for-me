import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../types";

export async function getTikTokSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }
  const tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";

  const tokenParams = new URLSearchParams([
    ["grant_type", "authorization_code"],
    ["client_key", appCredentials.appId!],
    ["client_secret", appCredentials.appSecret!],
    ["code", code],
    ["redirect_uri", redirectUri],
  ]);

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenParams.toString(),
  });
  const tokenResponseData = await tokenResponse.json();

  const {
    access_token,
    refresh_token,
    open_id,
    expires_in,
    refresh_expires_in,
  } = tokenResponseData;

  const userInfoResponse = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
  const userInfoResponseData = await userInfoResponse.json();

  const profilePhotoUrl = userInfoResponseData?.data?.user?.avatar_url;
  const publicProfilePhotoUrl = profilePhotoUrl;

  return [
    {
      social_provider_user_name: userInfoResponseData?.data?.user?.display_name,
      social_provider_user_id: open_id,
      social_provider_photo_url: publicProfilePhotoUrl,
      access_token: access_token,
      refresh_token: refresh_token,
      access_token_expires_at: new Date(Date.now() + expires_in * 1000),
      refresh_token_expires_at: new Date(
        Date.now() + refresh_expires_in * 1000
      ),
    },
  ];
}
