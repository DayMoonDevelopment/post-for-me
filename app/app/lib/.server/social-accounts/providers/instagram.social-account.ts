import { logError } from "~/lib/.server/errors";

import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../types";

export async function getInstagramSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const tokenUrl = `https://api.instagram.com/oauth/access_token`;
  const tokenParams = new URLSearchParams([
    ["client_id", appCredentials.appId!],
    ["client_secret", appCredentials.appSecret!],
    ["grant_type", "authorization_code"],
    ["redirect_uri", redirectUri],
    ["code", code],
  ]);
  const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenParams,
  });
  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    logError(new Error("Instagram token exchange returned no access_token"), {
      provider: "instagram",
      surface: "getInstagramSocialProviderConnection",
      providerError: tokenData?.error_message,
    });
    throw Error(
      `Error fetching access token ${tokenData?.error_message || ""}`,
    );
  }

  const longLivedTokenParams = new URLSearchParams([
    ["grant_type", "ig_exchange_token"],
    ["client_secret", appCredentials.appSecret!],
    ["access_token", tokenData.access_token],
  ]);

  const longLivedResponse = await fetch(
    `https://graph.instagram.com/access_token?${longLivedTokenParams.toString()}`,
  );

  const longLivedData = await longLivedResponse.json();

  const accessToken = longLivedData.access_token;

  let profileData: {
    profile_picture_url?: string;
    user_id?: string;
    username?: string;
  } = {};

  try {
    const profileResponse = await fetch(
      `https://graph.instagram.com/v23.0/me?fields=user_id,username,profile_picture_url&access_token=${accessToken}`,
      {
        method: "GET",
      },
    );

    profileData = await profileResponse.json();
  } catch (error) {
    logError(error, {
      provider: "instagram",
      surface: "getInstagramSocialProviderConnection.profile",
    });
  }

  const accounts: SocialProviderConnection[] = [
    {
      access_token: accessToken,
      access_token_expires_at: new Date(
        Date.now() + longLivedData.expires_in * 1000,
      ),
      social_provider_user_name:
        profileData.username || profileData.user_id || tokenData.user_id,
      social_provider_user_id: profileData.user_id || tokenData.user_id,
      social_provider_photo_url: profileData.profile_picture_url,
      social_provider_metadata: {
        connection_type: "instagram",
      },
    },
  ];

  return accounts;
}
