import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";

export async function getInstagramWFacebookSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token`;
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

  const longLivedTokenParams = new URLSearchParams([
    ["grant_type", "fb_exchange_token"],
    ["client_id", appCredentials.appId!],
    ["client_secret", appCredentials.appSecret!],
    ["fb_exchange_token", tokenData?.access_token],
  ]);

  const longLivedResponse = await fetch(
    `${tokenUrl}?${longLivedTokenParams.toString()}`
  );

  const longLivedData = await longLivedResponse.json();

  const accessToken = longLivedData.access_token;

  const allPages: {
    instagram_business_account: {
      id: string;
      name: string;
      username: string;
      profile_picture_url: string;
    };
  }[] = [];
  let pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=name,access_token,instagram_business_account{id,name,username,profile_picture_url}&limit=100&access_token=${accessToken}`;

  try {
    while (pagesUrl) {
      const response = await fetch(pagesUrl);
      const data = await response.json();

      if (!response.ok) {
        break;
      }

      if (data.data && data.data.length > 0) {
        allPages.push(...data.data);
      }

      pagesUrl = data.paging && data.paging.next ? data.paging.next : null;
    }
  } catch (error) {
    console.error("Error in getting pages:", error);
    throw error;
  }

  const accounts: SocialProviderConnection[] = [];
  for (const page of allPages) {
    if (page.instagram_business_account) {
      accounts.push({
        access_token: accessToken,
        access_token_expires_at: new Date(Date.now() + 5184000 * 1000),
        social_provider_user_name:
          page.instagram_business_account.username ||
          page.instagram_business_account.name,
        social_provider_user_id: page.instagram_business_account.id,
        social_provider_photo_url:
          page.instagram_business_account.profile_picture_url,
        social_provider_metadata: {
          connection_type: "instagram",
        },
      });
    }
  }

  return accounts;
}
