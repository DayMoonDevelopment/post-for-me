import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

import { SocialAccountDto } from './dto/social-accounts.dto';
import { SocialAccountQueryDto } from './dto/social-accounts-query.dto';
import type { PaginatedRequestQuery } from '../pagination/pagination-request.interface';
import { SocialProviderAppCredentialsDto } from '../social-provider-app-credentials/dto/social-provider-app-credentials.dto';
import { generateAuthUrl } from './helper/auth-url.helper';
import { ConfigService } from '@nestjs/config';
import { AuthUrlProviderData } from './dto/create-provider-auth-url.dto';
import { DeleteEntityResponseDto } from '../lib/global.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';
import {
  CreateSocialAccountDto,
  SocialAccountMetadata,
} from './dto/create-social-account.dto';

@Injectable()
export class SocialAccountsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async getSocialAccounts(
    queryParams: SocialAccountQueryDto,
    projectId: string,
  ): PaginatedRequestQuery<SocialAccountDto> {
    const { offset, limit, platform, username, external_id, id } = queryParams;

    const query = this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .select('*', { count: 'exact', head: false })
      .eq('project_id', projectId)
      .range(offset, offset + limit - 1);

    if (platform) {
      if (typeof platform === 'string') {
        query.eq('provider', platform);
      } else if (Array.isArray(platform)) {
        query.in(
          'provider',
          platform.map(
            (provider) =>
              provider as
                | 'facebook'
                | 'instagram'
                | 'x'
                | 'tiktok'
                | 'youtube'
                | 'pinterest'
                | 'linkedin'
                | 'bluesky'
                | 'threads',
          ),
        );
      }
    }

    if (external_id) {
      if (typeof external_id === 'string') {
        query.eq('external_id', external_id);
      } else if (Array.isArray(external_id)) {
        query.in('external_id', external_id);
      }
    }

    if (id) {
      if (typeof id === 'string') {
        query.eq('id', id);
      } else if (Array.isArray(id)) {
        query.in('id', id);
      }
    }

    if (username) {
      if (typeof username === 'string') {
        query.eq('username', username);
      } else if (Array.isArray(username)) {
        query.in('username', username);
      }
    }

    query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const transformedData: SocialAccountDto[] = data.map((raw) => ({
      id: raw.id,
      platform: raw.provider || '',
      username: raw.social_provider_user_name || '',
      user_id: raw.social_provider_user_id || '',
      status: raw.access_token ? 'connected' : 'disconnected',
      external_id: raw.external_id,
      access_token: raw.access_token || '',
      refresh_token: raw.refresh_token || '',
      access_token_expires_at:
        raw.access_token_expires_at || new Date().toISOString(),
      refresh_token_expires_at: raw.refresh_token_expires_at,
      metadata: raw.social_provider_metadata as SocialAccountMetadata,
    }));

    return {
      data: transformedData,
      count: count || 0,
    };
  }

  async getSocialAccountById({
    id,
    projectId,
  }: {
    id: string;
    projectId: string;
  }): Promise<SocialAccountDto | null> {
    const socialAccount = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .select('*')
      .eq('id', id)
      .eq('project_id', projectId)
      .maybeSingle();

    if (socialAccount.error) {
      throw socialAccount.error;
    }

    if (!socialAccount.data) {
      return null;
    }

    return {
      id: socialAccount.data.id,
      platform: socialAccount.data.provider || '',
      username: socialAccount.data.social_provider_user_name || '',
      user_id: socialAccount.data.social_provider_user_id || '',
      status: socialAccount.data.access_token ? 'connected' : 'disconnected',
      external_id: socialAccount.data.external_id,
      access_token: socialAccount.data.access_token || '',
      refresh_token: socialAccount.data.refresh_token || '',
      access_token_expires_at:
        socialAccount.data.access_token_expires_at || new Date().toISOString(),
      refresh_token_expires_at: socialAccount.data.refresh_token_expires_at,
      metadata: socialAccount.data
        .social_provider_metadata as SocialAccountMetadata,
    };
  }

  async getSocialAccountAuthUrl({
    projectId,
    appCredentials,
    providerData,
    externalId,
  }: {
    projectId: string;
    appCredentials: SocialProviderAppCredentialsDto;
    providerData: AuthUrlProviderData | null | undefined;
    externalId: string | undefined;
  }): Promise<string | undefined> {
    const project = await this.supabaseService.supabaseClient
      .from('projects')
      .select('is_system')
      .eq('id', projectId)
      .single();

    const isSystem = project.data?.is_system || false;
    const authUrl = await generateAuthUrl({
      projectId,
      isSystem,
      appCredentials,
      configService: this.configService,
      supabaseService: this.supabaseService,
      providerData,
      externalId,
    });

    return authUrl;
  }

  async deleteSocialAccount({
    id,
    projectId,
  }: {
    id: string;
    projectId: string;
  }): Promise<DeleteEntityResponseDto> {
    const { error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  async createSocialAccount({
    projectId,
    socialAccount,
  }: {
    projectId: string;
    socialAccount: CreateSocialAccountDto;
  }): Promise<SocialAccountDto> {
    let meatadata: SocialAccountMetadata = {};

    if (socialAccount.metadata) {
      meatadata = socialAccount.metadata;
    }

    const { data, error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .upsert(
        {
          project_id: projectId,
          provider: socialAccount.platform,
          social_provider_user_name: socialAccount.username,
          social_provider_user_id: socialAccount.user_id,
          external_id: socialAccount.external_id,
          access_token: socialAccount.access_token,
          refresh_token: socialAccount.refresh_token,
          access_token_expires_at:
            socialAccount.access_token_expires_at.toISOString(),
          refresh_token_expires_at: socialAccount.refresh_token_expires_at
            ? socialAccount.refresh_token_expires_at.toISOString()
            : null,
          social_provider_metadata: { ...meatadata },
        },
        {
          onConflict: 'provider,project_id,social_provider_user_id',
        },
      )
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      platform: data.provider || '',
      username: data.social_provider_user_name || '',
      user_id: data.social_provider_user_id || '',
      status: data.access_token ? 'connected' : 'disconnected',
      external_id: data.external_id,
      access_token: data.access_token || '',
      refresh_token: data.refresh_token || '',
      access_token_expires_at:
        data.access_token_expires_at || new Date().toISOString(),
      refresh_token_expires_at: data.refresh_token_expires_at,
      metadata: data.social_provider_metadata as SocialAccountMetadata,
    };
  }

  async updateSocialAccount({
    id,
    projectId,
    updateData,
  }: {
    id: string;
    projectId: string;
    updateData: UpdateSocialAccountDto;
  }): Promise<SocialAccountDto> {
    const updateFields: {
      social_provider_user_name?: string;
      external_id?: string;
    } = {};

    if (updateData.username !== undefined) {
      updateFields.social_provider_user_name = updateData.username;
    }

    if (updateData.external_id !== undefined) {
      updateFields.external_id = updateData.external_id;
    }

    const { data, error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .update(updateFields)
      .eq('id', id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      platform: data.provider || '',
      username: data.social_provider_user_name || '',
      user_id: data.social_provider_user_id || '',
      status: data.access_token ? 'connected' : 'disconnected',
      external_id: data.external_id,
      access_token: data.access_token || '',
      refresh_token: data.refresh_token || '',
      access_token_expires_at:
        data.access_token_expires_at || new Date().toISOString(),
      refresh_token_expires_at: data.refresh_token_expires_at,
      metadata: data.social_provider_metadata as SocialAccountMetadata,
    };
  }

  async disconnectSocialAccount(id: string, projectId: string): Promise<void> {
    const { error } = await this.supabaseService.supabaseClient
      .from('social_provider_connections')
      .update({
        access_token: null,
        refresh_token: null,
      })
      .eq('id', id)
      .eq('project_id', projectId);

    if (error) {
      throw new Error(error.message);
    }
  }
}
