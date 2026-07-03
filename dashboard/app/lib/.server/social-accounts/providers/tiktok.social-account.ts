import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";

function getTikTokErrorMessage(responseData: unknown): string | null {
  if (!responseData || typeof responseData !== "object") {
    return null;
  }

  const data = responseData as {
    error?: unknown;
    error_description?: unknown;
    message?: unknown;
  };

  if (typeof data.error_description === "string" && data.error_description) {
    return data.error_description;
  }

  if (typeof data.message === "string" && data.message) {
    return data.message;
  }

  if (typeof data.error === "string" && data.error) {
    return data.error;
  }

  if (data.error && typeof data.error === "object") {
    const nestedError = data.error as {
      message?: unknown;
      code?: unknown;
    };

    if (typeof nestedError.message === "string" && nestedError.message) {
      return nestedError.message;
    }

    if (typeof nestedError.code === "string" && nestedError.code) {
      return nestedError.code;
    }
  }

  return null;
}

export async function getTikTokSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("TikTok authorization failed: no authorization code provided");
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

  const tokenErrorMessage = getTikTokErrorMessage(tokenResponseData);

  if (!tokenResponse.ok) {
    throw Error(
      `TikTok authorization failed${tokenErrorMessage ? `: ${tokenErrorMessage}` : ""}`,
    );
  }

  const {
    access_token,
    refresh_token,
    open_id,
    expires_in,
    refresh_expires_in,
  } = tokenResponseData;

  const accessTokenExpiresInSeconds = Number(expires_in);
  const refreshTokenExpiresInSeconds = Number(refresh_expires_in);

  if (
    !access_token ||
    !open_id ||
    !Number.isFinite(accessTokenExpiresInSeconds)
  ) {
    throw Error(
      `TikTok account could not be connected${tokenErrorMessage ? `: ${tokenErrorMessage}` : ""}`,
    );
  }

  const userInfoResponse = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
  const userInfoResponseData = await userInfoResponse.json();

  if (!userInfoResponse.ok) {
    const userInfoErrorMessage = getTikTokErrorMessage(userInfoResponseData);
    throw Error(
      `TikTok account could not be connected${userInfoErrorMessage ? `: ${userInfoErrorMessage}` : ""}`,
    );
  }

  const profilePhotoUrl = userInfoResponseData?.data?.user?.avatar_url;
  const publicProfilePhotoUrl = profilePhotoUrl;

  return [
    {
      social_provider_user_name:
        userInfoResponseData?.data?.user?.display_name || open_id,
      social_provider_user_id: open_id,
      social_provider_photo_url: publicProfilePhotoUrl,
      access_token: access_token,
      refresh_token: refresh_token,
      access_token_expires_at: new Date(
        Date.now() + accessTokenExpiresInSeconds * 1000,
      ),
      refresh_token_expires_at: Number.isFinite(refreshTokenExpiresInSeconds)
        ? new Date(Date.now() + refreshTokenExpiresInSeconds * 1000)
        : undefined,
    },
  ];
}
