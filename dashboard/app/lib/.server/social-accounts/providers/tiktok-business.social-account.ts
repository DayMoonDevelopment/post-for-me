import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";

export async function getTikTokBusinessSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  try {
    const url = new URL(request.url);

    const code = url.searchParams.get("code");

    if (!code) {
      throw Error("No code provided");
    }
    const tokenUrl =
      "https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/";

    const tokenParams = {
      grant_type: "authorization_code",
      client_id: appCredentials.appId!,
      client_secret: appCredentials.appSecret!,
      auth_code: code,
      redirect_uri: redirectUri,
    };

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenParams),
    });
    const tokenResponseData = await tokenResponse.json();

    const userInfoResponse = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/business/get/?business_id=${tokenResponseData.data.open_id}&fields=["display_name", "profile_image", "username"]`,
      {
        headers: {
          "Access-Token": `${tokenResponseData.data.access_token}`,
        },
      },
    );
    const userInfoResponseData = await userInfoResponse.json();

    const profilePhotoUrl = userInfoResponseData?.data?.profile_image;
    const publicProfilePhotoUrl = profilePhotoUrl;

    return [
      {
        social_provider_user_name:
          userInfoResponseData?.data?.username ||
          userInfoResponseData?.data?.display_name,
        social_provider_user_id: tokenResponseData.data.open_id,
        social_provider_photo_url: publicProfilePhotoUrl,
        access_token: tokenResponseData.data.access_token,
        refresh_token: tokenResponseData.data.refresh_token,
        access_token_expires_at: new Date(
          Date.now() + tokenResponseData.data.expires_in * 1000,
        ),
        refresh_token_expires_at: new Date(
          Date.now() + tokenResponseData.data.refresh_token_expires_in * 1000,
        ),
      },
    ];
  } catch (e) {
    console.error(e);
    return [];
  }
}
