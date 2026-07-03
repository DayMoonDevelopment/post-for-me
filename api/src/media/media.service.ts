import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';

import { SupabaseStorageProvider } from '../storage/supabase-storage.provider';
import { CreateUploadUrlResponseDto } from './dto/create-upload-url-response.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly storageProvider: SupabaseStorageProvider,
    private readonly configService: ConfigService,
  ) {}

  async createUploadUrl(
    projectId: string,
  ): Promise<CreateUploadUrlResponseDto> {
    const baseStorageUrl =
      this.configService.get<string>('BASE_STORAGE_URL') ||
      'https://data.postforme.dev/storage/v1/object/public/post-media';

    const randomString = randomBytes(8).toString('hex');
    const hash = createHash('sha256')
      .update(projectId + Date.now().toString() + randomString)
      .digest('hex')
      .slice(0, 24);

    const key = `${projectId}/${hash}`;
    const bucket = 'post-media';

    const signedUrl = await this.storageProvider.createSignedUploadUrl(
      bucket,
      key,
    );

    return {
      upload_url: signedUrl,
      media_url: `${baseStorageUrl}/${key}`,
    };
  }
}
