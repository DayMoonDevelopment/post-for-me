import { logError } from "~/lib/.server/errors";

import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../types";

export async function getThreadsSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const tokenUrl = "https://graph.threads.net/oauth/access_token";
  const tokenParams = new URLSearchParams([
    ["client_id", appCredentials.appId!],
    ["client_secret", appCredentials.appSecret!],
    ["redirect_uri", redirectUri],
    ["code", code],
    ["grant_type", "authorization_code"],
  ]);
  const tokenResponse = await fetch(`${tokenUrl}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenParams,
  });

  if (!tokenResponse.ok) {
    const response = await tokenResponse.text();
    logError(new Error("Threads token exchange failed"), {
      provider: "threads",
      surface: "getThreadsSocialProviderConnection.token",
    });
    throw Error("Error fetching access token");
  }

  const tokenData = await tokenResponse.json();

  const { access_token: shortLivedToken, user_id } = tokenData;

  const longLivedTokenParams = new URLSearchParams([
    ["client_secret", appCredentials.appSecret!],
    ["grant_type", "th_exchange_token"],
    ["access_token", shortLivedToken],
  ]);

  const longLivedTokenResponse = await fetch(
    `https://graph.threads.net/access_token?${longLivedTokenParams.toString()}`,
    { method: "GET" }
  );

  if (!longLivedTokenResponse.ok) {
    const response = await longLivedTokenResponse.text();
    logError(new Error("Threads long-lived token exchange failed"), {
      provider: "threads",
      surface: "getThreadsSocialProviderConnection.longLivedToken",
    });
    throw Error("Error fetching long lived token");
  }

  const longLivedTokenData = await longLivedTokenResponse.json();

  const { access_token: longLivedToken, expires_in } = longLivedTokenData;

  const userParams = new URLSearchParams([
    ["access_token", longLivedToken],
    ["fields", "id,username,name,threads_profile_picture_url"],
  ]);

  const userResponse = await fetch(
    `https://graph.threads.net/v1.0/me?${userParams.toString()}`,
    { method: "GET" }
  );

  if (!userResponse.ok) {
    const response = await userResponse.text();
    logError(new Error("Threads user fetch failed"), {
      provider: "threads",
      surface: "getThreadsSocialProviderConnection.user",
    });
    throw Error("Error fetching user data");
  }

  const userData = await userResponse.json();

  const { username, name, threads_profile_picture_url } = userData;

  return [
    {
      social_provider_user_id: user_id,
      social_provider_user_name: username || name || user_id,
      social_provider_photo_url: threads_profile_picture_url,
      access_token: longLivedToken,
      refresh_token: longLivedToken,
      access_token_expires_at: new Date(Date.now() + expires_in * 1000),
      refresh_token_expires_at: new Date(Date.now() + expires_in * 1000),
    },
  ];
}
