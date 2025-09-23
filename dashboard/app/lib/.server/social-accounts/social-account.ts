import type { Database } from "@post-for-me/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REDIRECT_APP_URL,
  SOCIAL_ACCOUNT_PHOTO_BUCKET_NAME,
} from "./social-account.constants";
import type {
  Provider,
  SocialProviderConnection,
  SocialProviderInfo,
} from "./social-account.types";

import { getTikTokSocialProviderConnection } from "./providers/tiktok.social-account";
import { getInstagramSocialProviderConnection } from "./providers/instagram.social-account";
import { getFacebookSocialProviderConnection } from "./providers/facebook.social-account";
import { getXSocialProviderConnection } from "./providers/x.social-account";
import { getLinkedInSocialProviderConnection } from "./providers/linkedin.social-account";
import { getYoutubeSocialProviderConnection } from "./providers/youtube.social-account";
import { getPinterestSocialProviderConnection } from "./providers/pinterest.social-account";
import { getBlueskySocialProviderConnection } from "./providers/bluesky.social-account";
import { getThreadsSocialProviderConnection } from "./providers/threads.social-account";
import { getTikTokBusinessSocialProviderConnection } from "./providers/tiktok-business.social-account";
import { getInstagramWFacebookSocialProviderConnection } from "./providers/instagram-w-facebook.social-account";

import { tasks } from "@trigger.dev/sdk";

export async function addSocialAccountConnections({
  projectId,
  provider,
  request,
  supabaseServiceRole,
  isSystem,
  appCredentials,
  externalId,
}: {
  supabaseServiceRole: SupabaseClient<Database>;
  projectId: string;
  provider: string;
  request: Request;
  isSystem: boolean;
  appCredentials: {
    appId?: string | null;
    appSecret?: string | null;
  };
  externalId: string | undefined | null;
}) {
  let redirectUri = `${REDIRECT_APP_URL}/callback/${projectId}/${provider}/account`;

  if (isSystem) {
    redirectUri = `${REDIRECT_APP_URL}/callback/${provider}/account`;
  }

  const socialProviderConnections: SocialProviderConnection[] =
    await getSocialProviderConnections(provider, {
      redirectUri,
      request,
      appCredentials,
      supabaseServiceRole,
      projectId,
    });

  const connectionsToInsert = await Promise.all(
    socialProviderConnections.map(async (connection) => ({
      provider: (provider == "instagram_w_facebook"
        ? "instagram"
        : provider) as Provider,
      project_id: projectId,
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      access_token_expires_at: connection.access_token_expires_at.toISOString(),
      refresh_token_expires_at: connection.refresh_token_expires_at
        ? connection.refresh_token_expires_at.toISOString()
        : null,
      social_provider_user_id: connection.social_provider_user_id,
      social_provider_user_name: connection.social_provider_user_name,
      social_provider_profile_photo_url: await getPublicProfilePhotoUrl({
        profilePhotoUrl: connection.social_provider_photo_url,
        projectId,
        provider,
        providerUsername: connection.social_provider_user_name,
        providerId: connection.social_provider_user_id,
        supabaseServiceRole,
      }),
      social_provider_metadata: connection.social_provider_metadata,
      external_id: externalId,
    }))
  );

  const { data: insertedConnections, error: connectionsError } =
    await supabaseServiceRole
      .from("social_provider_connections")
      .upsert(connectionsToInsert, {
        onConflict: "provider,project_id,social_provider_user_id",
      })
      .select();

  if (insertedConnections && insertedConnections.length > 0) {
    const events = insertedConnections.map((c) => ({
      payload: {
        projectId,
        eventType: "social.account.created",
        eventData: {
          id: c.id,
          platform: c.provider || "",
          username: c.social_provider_user_name || "",
          user_id: c.social_provider_user_id || "",
          status: c.access_token ? "connected" : "disconnected",
          external_id: c.external_id,
          access_token: c.access_token || "",
          refresh_token: c.refresh_token || "",
          access_token_expires_at:
            c.access_token_expires_at || new Date().toISOString(),
          refresh_token_expires_at: c.refresh_token_expires_at,
          metadata: c.social_provider_metadata,
        },
      },
    }));
    await tasks.batchTrigger("process-webhooks", events);
  }

  if (connectionsError) {
    console.error(connectionsError);
  }

  return insertedConnections;
}

async function getSocialProviderConnections(
  provider: string,
  info: SocialProviderInfo
): Promise<SocialProviderConnection[]> {
  try {
    switch (provider) {
      case "tiktok":
        return getTikTokSocialProviderConnection(info);
      case "instagram":
        return getInstagramSocialProviderConnection(info);
      case "facebook":
        return getFacebookSocialProviderConnection(info);
      case "x":
        return getXSocialProviderConnection(info);
      case "youtube":
        return getYoutubeSocialProviderConnection(info);
      case "linkedin":
        return getLinkedInSocialProviderConnection(info);
      case "pinterest":
        return getPinterestSocialProviderConnection(info);
      case "bluesky":
        return getBlueskySocialProviderConnection(info);
      case "threads":
        return getThreadsSocialProviderConnection(info);
      case "tiktok_business":
        return getTikTokBusinessSocialProviderConnection(info);
      case "instagram_w_facebook":
        return getInstagramWFacebookSocialProviderConnection(info);
      default:
        return [];
    }
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getPublicProfilePhotoUrl({
  profilePhotoUrl,
  projectId,
  providerUsername,
  providerId,
  supabaseServiceRole,
  provider,
}: {
  profilePhotoUrl: string | undefined | null;
  projectId: string;
  provider: string;
  providerUsername: string | undefined | null;
  providerId: string;
  supabaseServiceRole: SupabaseClient<Database>;
}): Promise<string> {
  if (!profilePhotoUrl) {
    return "";
  }

  try {
    // Fetch the image
    const imageResponse = await fetch(profilePhotoUrl);
    const imageBlob = await imageResponse.blob();

    // Generate a unique filename
    const fileName = `${(providerUsername || providerId).replace(" ", "")}_profile.jpg`;
    const filePath = `projects/${projectId}/${provider}/${fileName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabaseServiceRole.storage
      .from(SOCIAL_ACCOUNT_PHOTO_BUCKET_NAME)
      .upload(filePath, imageBlob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Profile image upload error:", uploadError);
      return profilePhotoUrl;
    }
    // Get public URL
    const { data: publicUrlData } = supabaseServiceRole.storage
      .from(SOCIAL_ACCOUNT_PHOTO_BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (uploadError) {
    console.error("Profile image processing error:", uploadError);
  }

  return profilePhotoUrl;
}
