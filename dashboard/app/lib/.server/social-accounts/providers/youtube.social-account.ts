import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";
import { google } from "googleapis";

export async function getYoutubeSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const oauth2Client = new google.auth.OAuth2(
    appCredentials.appId!,
    appCredentials.appSecret!,
    redirectUri,
  );
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  if (!tokens.access_token) {
    return [];
  }

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const { data: userInfo } = await youtube.channels.list({
    part: ["snippet"],
    mine: true,
  });

  if (!userInfo.items || userInfo.items.length === 0) {
    return [];
  }

  return userInfo.items
    .filter((c) => c.id)
    .map((channel) => {
      const profilePhotoUrl =
        channel.snippet?.thumbnails?.high?.url ||
        channel.snippet?.thumbnails?.default?.url;

      return {
        social_provider_user_id: channel.id!,
        social_provider_user_name: channel.snippet?.title ?? "",
        social_provider_photo_url: profilePhotoUrl ?? undefined,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token ?? "",
        access_token_expires_at: new Date(
          Date.now() + (tokens.expiry_date ?? 1000),
        ),
      };
    });
}
