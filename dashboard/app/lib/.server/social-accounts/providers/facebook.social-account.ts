import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";

export async function getFacebookSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const tokenUrl = `https://graph.facebook.com/v23.0/oauth/access_token`;
  const tokenParams = new URLSearchParams([
    ["client_id", appCredentials.appId!],
    ["client_secret", appCredentials.appSecret!],
    ["redirect_uri", redirectUri],
    ["code", code],
  ]);

  const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`, {
    method: "GET",
  });

  const tokenData = await tokenResponse.json();

  console.log(tokenData);
  const longLivedTokenParams = new URLSearchParams([
    ["grant_type", "fb_exchange_token"],
    ["client_id", appCredentials.appId!],
    ["client_secret", appCredentials.appSecret!],
    ["fb_exchange_token", tokenData?.access_token],
  ]);

  const longLivedResponse = await fetch(
    `${tokenUrl}?${longLivedTokenParams.toString()}`,
  );

  const longLivedData = await longLivedResponse.json();

  const accessToken = longLivedData.access_token;

  let accountsUrl = `https://graph.facebook.com/v23.0/me/accounts?fields=name,access_token,picture&limit=100&access_token=${accessToken}`;

  const accounts: SocialProviderConnection[] = [];

  try {
    while (accountsUrl) {
      const response = await fetch(accountsUrl);
      const data = await response.json();

      if (!response.ok) {
        break;
      }

      if (data && data.data.length > 0) {
        for (const page of data.data) {
          const profilePhotoUrl = page?.picture?.data?.url;

          accounts.push({
            social_provider_user_id: page.id,
            social_provider_user_name: page.name,
            social_provider_photo_url: profilePhotoUrl,
            access_token: page.access_token,
            access_token_expires_at: new Date(Date.now() + 5184000 * 1000),
          });
        }
      }

      accountsUrl = data.paging && data.paging.next ? data.paging.next : null;
    }
  } catch (error) {
    console.error("Error in getting pages:", error);
    throw error;
  }

  return accounts;
}
