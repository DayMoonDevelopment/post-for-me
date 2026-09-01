import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';

import { getStorageProvider } from '../storage/storage.factory';
import { getMediaBucket } from '../constants/media.constants';
import { CreateUploadUrlResponseDto } from './dto/create-upload-url-response.dto';

@Injectable()
export class MediaService {
  constructor(private readonly configService: ConfigService) {}

  async createUploadUrl(
    projectId: string,
    teamId: string,
  ): Promise<CreateUploadUrlResponseDto> {
    const storageProvider = await getStorageProvider(teamId, projectId);

    const randomString = randomBytes(8).toString('hex');
    const hash = createHash('sha256')
      .update(projectId + Date.now().toString() + randomString)
      .digest('hex')
      .slice(0, 24);

    const key = `${projectId}/${hash}`;
    const bucket = getMediaBucket(this.configService);

    const signedUrl = await storageProvider.createSignedUploadUrl(bucket, key);

    return {
      upload_url: signedUrl,
      media_url: storageProvider.getPublicUrl(bucket, key),
      key,
    };
  }
}
