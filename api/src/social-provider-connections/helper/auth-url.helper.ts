import { randomUUID } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { SocialProviderAppCredentialsDto } from 'src/social-provider-app-credentials/dto/social-provider-app-credentials.dto';
import { TwitterApi, type TwitterApiTokens } from 'twitter-api-v2';
import { google } from 'googleapis';
import type { SupabaseService } from '../../supabase/supabase.service';
import type { AuthUrlProviderData } from '../dto/create-provider-auth-url.dto';
import type { Database } from '@post-for-me/db';

type SocialProviderEnum = Database['public']['Enums']['social_provider'];

export async function generateAuthUrl({
  projectId,
  isSystem,
  appCredentials,
  configService,
  supabaseService,
  providerData,
  externalId,
  redirectUrlOverride,
}: {
  projectId: string;
  isSystem: boolean;
  appCredentials: SocialProviderAppCredentialsDto;
  configService: ConfigService;
  supabaseService: SupabaseService;
  providerData: AuthUrlProviderData | null | undefined;
  externalId: string | undefined;
  redirectUrlOverride: string | undefined | null;
}): Promise<string | undefined> {
  const { appId, appSecret } = appCredentials;

  const provider =
    appCredentials.provider == 'instagram_w_facebook'
      ? 'instagram'
      : appCredentials.provider;

  const appUrl = configService.get<string>('DASHBOARD_APP_URL');

  let callbackUrl =
    redirectUrlOverride ||
    `${appUrl}/callback/${projectId}/${provider}/account`;

  const authState = generateOAuthState();

  const oauthData: {
    project_id: string;
    provider: SocialProviderEnum;
    key: string;
    key_id: string;
    value: string;
  }[] = [];

  if (isSystem) {
    oauthData.push({
      project_id: projectId,
      provider: provider as SocialProviderEnum,
      key: 'project',
      key_id: authState,
      value: projectId,
    });

    callbackUrl = `${appUrl}/callback/${provider}/account`;
  }

  if (externalId) {
    oauthData.push({
      project_id: projectId,
      provider: provider as SocialProviderEnum,
      key: 'external_id',
      key_id: authState,
      value: externalId,
    });
  }

  let authUrl: string | undefined = undefined;
  switch (appCredentials.provider) {
    case 'facebook': {
      const scopes = [
        'public_profile',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'business_management',
      ];
      const facebookVersion =
        configService.get<string>('FACEBOOK_API_VERSION') || 'v23.0';
      const authParams = new URLSearchParams([
        ['client_id', appId],
        ['redirect_uri', callbackUrl],
        ['scope', scopes.join(',')],
        ['response_type', 'code'],
        ['state', authState],
      ]);

      authUrl = `https://www.facebook.com/${facebookVersion}/dialog/oauth?${authParams.toString()}`;

      break;
    }
    case 'instagram_w_facebook': {
      oauthData.push({
        project_id: projectId,
        provider: provider as SocialProviderEnum,
        key: 'connection_type',
        key_id: authState,
        value: 'facebook',
      });
      const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'public_profile',
        'business_management',
        //Feed permissions
        'pages_read_engagement',
        'instagram_manage_insights',
      ];
      const facebookVersion =
        configService.get<string>('FACEBOOK_API_VERSION') || 'v23.0';
      const authParams = new URLSearchParams([
        ['client_id', appId],
        ['redirect_uri', callbackUrl],
        ['scope', scopes.join(',')],
        ['response_type', 'code'],
        ['state', authState],
      ]);

      authUrl = `https://www.facebook.com/${facebookVersion}/dialog/oauth?${authParams.toString()}`;
      break;
    }
    case 'instagram': {
      const scopes = [
        'instagram_business_basic',
        'instagram_business_content_publish',
        //Feeds permissions
        'instagram_business_manage_insights',
      ];

      const authParams = new URLSearchParams([
        ['client_id', appId],
        ['redirect_uri', callbackUrl],
        ['scope', scopes.join(',')],
        ['response_type', 'code'],
        ['state', authState],
        ['force_reauth', 'false'],
      ]);

      authUrl = `https://www.instagram.com/oauth/authorize?${authParams.toString()}`;

      break;
    }
    case 'x': {
      const client = new TwitterApi({
        appKey: appId,
        appSecret: appSecret,
      } as TwitterApiTokens);

      const authLink = await client.generateAuthLink(callbackUrl, {
        linkMode: 'authorize',
      });

      authUrl = authLink.url;

      oauthData.push({
        project_id: projectId,
        provider: 'x',
        key: 'oauth_token',
        key_id: authLink.oauth_token,
        value: authLink.oauth_token_secret,
      });

      if (externalId) {
        oauthData.push({
          project_id: projectId,
          provider: 'x',
          key: 'external_id',
          key_id: authLink.oauth_token,
          value: externalId,
        });
      }

      if (isSystem) {
        oauthData.push({
          project_id: projectId,
          provider: 'x',
          key: 'project',
          key_id: authLink.oauth_token,
          value: projectId,
        });
      }

      break;
    }
    case 'tiktok': {
      const scopes = [
        'user.info.basic',
        'video.list',
        'video.upload',
        'video.publish',
      ];

      const authParams = new URLSearchParams([
        ['client_key', appId],
        ['redirect_uri', callbackUrl],
        ['scope', scopes.join(',')],
        ['response_type', 'code'],
        ['state', authState],
        ['disable_auto_auth', '1'],
      ]);

      const tikTokVersion =
        configService.get<string>('TIKTOK_API_VERSION') || 'v2';

      authUrl = `https://www.tiktok.com/${tikTokVersion}/auth/authorize/?${authParams.toString()}`;

      break;
    }
    case 'tiktok_business': {
      const scopes = [
        'user.info.basic',
        'user.info.username',
        'user.info.stats',
        'user.info.profile',
        'user.account.type',
        'user.insights',
        'video.list',
        'video.insights',
        'comment.list',
        'comment.list.manage',
        'video.publish',
        'video.upload',
        'biz.spark.auth',
        'discovery.search.words',
      ];

      const authParams = new URLSearchParams([
        ['client_key', appId],
        ['redirect_uri', callbackUrl],
        ['scope', scopes.join(',')],
        ['response_type', 'code'],
        ['disable_auto_auth', '1'],
        ['state', authState],
      ]);

      const tikTokVersion =
        configService.get<string>('TIKTOK_API_VERSION') || 'v2';

      authUrl = `https://www.tiktok.com/${tikTokVersion}/auth/authorize/?${authParams.toString()}`;
      break;
    }
    case 'youtube': {
      const oauth2Client = new google.auth.OAuth2(
        appId,
        appSecret,
        callbackUrl,
      );

      const scopes = [
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        //Feed Permissions
        'https://www.googleapis.com/auth/yt-analytics.readonly',
      ];

      authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        include_granted_scopes: true,
        prompt: 'consent',
        state: authState,
      });

      break;
    }
    case 'pinterest': {
      const scopes = [
        'boards:read',
        'boards:write',
        'pins:read',
        'pins:write',
        'user_accounts:read',
      ];

      const authParams = new URLSearchParams([
        ['client_id', appId],
        ['redirect_uri', callbackUrl],
        ['scope', scopes.join(',')],
        ['response_type', 'code'],
        ['state', authState],
      ]);

      authUrl = `https://www.pinterest.com/oauth/?${authParams.toString()}`;
      break;
    }
    case 'linkedin': {
      const isOrgConnection =
        providerData?.linkedin?.connection_type === 'organization';

      const scope = isOrgConnection
        ? 'r_basicprofile w_member_social r_organization_social w_organization_social rw_organization_admin'
        : 'openid w_member_social profile email';
      const authParams = new URLSearchParams([
        ['client_id', appId],
        ['redirect_uri', callbackUrl],
        ['scope', scope],
        ['response_type', 'code'],
        ['state', authState],
      ]);

      authUrl = `https://www.linkedin.com/oauth/v2/authorization?${authParams.toString()}`;

      break;
    }
    case 'bluesky': {
      if (
        !providerData ||
        providerData.bluesky === undefined ||
        providerData.bluesky.handle === undefined ||
        providerData.bluesky.app_password === undefined
      ) {
        break;
      }

      const handle = providerData.bluesky.handle
        .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
        .replace(/[^\w.-]/g, '')
        .trim();

      oauthData.push({
        project_id: projectId,
        provider: 'bluesky',
        key: 'app_password',
        key_id: handle,
        value: providerData.bluesky.app_password,
      });

      authUrl = `${callbackUrl}?handle=${encodeURIComponent(handle)}&state=${authState}`;
      break;
    }
    case 'threads': {
      const scopes = ['threads_basic', 'threads_content_publish'];
      const authParams = new URLSearchParams([
        ['client_id', appId],
        ['redirect_uri', callbackUrl],
        ['scope', scopes.join(',')],
        ['response_type', 'code'],
        ['state', authState],
      ]);

      authUrl = `https://threads.net/oauth/authorize?${authParams.toString()}`;

      break;
    }
  }

  if (oauthData.length > 0) {
    await supabaseService.supabaseClient
      .from('social_provider_connection_oauth_data')
      .upsert(oauthData, { onConflict: 'project_id, provider, key, key_id' });
  }

  return authUrl;
}

function generateOAuthState() {
  return 'oad' + randomUUID().replace(/-/g, '');
}
