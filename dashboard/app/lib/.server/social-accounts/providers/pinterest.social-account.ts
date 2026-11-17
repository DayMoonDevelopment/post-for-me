import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";

export async function getPinterestSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const tokenUrl = `https://api.pinterest.com/v5/oauth/token`;
  const tokenParams = new URLSearchParams([
    ["grant_type", "authorization_code"],
    ["redirect_uri", redirectUri],
    ["code", code],
    ["continuous_refresh", "true"],
  ]);
  const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${appCredentials.appId!}:${appCredentials.appSecret!}`
      ).toString("base64")}`,
    },
    body: tokenParams,
  });
  const tokenData = await tokenResponse.json();

  if (!tokenData?.access_token) {
    console.error("Error fetching access token", tokenData);
    throw Error(`Error fetching access token ${tokenData?.message || ""}`);
  }

  const { access_token, refresh_token, expires_in } = tokenData;

  const userResponse = await fetch(
    "https://api.pinterest.com/v5/user_account",
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );

  const userData = await userResponse.json();

  const { id, username, profile_image } = userData;

  return [
    {
      social_provider_user_id: id || username,
      social_provider_user_name: username,
      social_provider_photo_url: profile_image,
      access_token,
      refresh_token,
      access_token_expires_at: new Date(Date.now() + expires_in * 1000),
      refresh_token_expires_at: new Date(Date.now() + 5184000 * 1000),
    },
  ];
}
