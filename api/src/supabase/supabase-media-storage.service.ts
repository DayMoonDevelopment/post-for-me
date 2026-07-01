import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../supabase';
import {
  MediaStorageService,
  type UploadCredentials,
} from '../media/media-storage.service';

@Injectable()
export class SupabaseMediaStorageService extends MediaStorageService {
  private readonly supabaseClient: SupabaseClient<Database>;
  private readonly supabaseUrl: string;
  private readonly bucket = 'post-media';

  constructor(private readonly configService: ConfigService) {
    super();
    this.supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_KEY',
    );
    this.supabaseClient = createClient<Database>(this.supabaseUrl, serviceKey);
  }

  async createUploadCredentials(
    key: string,
    _: string,
  ): Promise<UploadCredentials> {
    const { data, error } = await this.supabaseClient.storage
      .from(this.bucket)
      .createSignedUploadUrl(key);
    if (error) throw new Error(`Supabase upload URL error: ${error.message}`);
    return { url: data.signedUrl, method: 'PUT', fields: {} };
  }

  async createSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabaseClient.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresIn);
    if (error)
      throw new Error(`Supabase signed read URL error: ${error.message}`);
    return data.signedUrl;
  }

  getPublicUrl(key: string): string {
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${key}`;
  }
}
