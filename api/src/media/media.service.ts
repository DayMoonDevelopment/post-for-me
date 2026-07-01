import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { MediaStorageService } from './media-storage.service';
import { CreateUploadUrlResponseDto } from './dto/create-upload-url-response.dto';

@Injectable()
export class MediaService {
  constructor(private readonly storageService: MediaStorageService) {}

  async createUploadUrl(
    projectId: string,
    contentType: string,
  ): Promise<CreateUploadUrlResponseDto> {
    const randomString = randomBytes(8).toString('hex');
    const hash = createHash('sha256')
      .update(projectId + Date.now().toString() + randomString)
      .digest('hex')
      .slice(0, 24);

    const key = `${projectId}/${hash}`;

    const { url, method, fields } =
      await this.storageService.createUploadCredentials(key, contentType);
    const media_url = this.storageService.getPublicUrl(key);

    return {
      upload_url: url,
      upload_method: method,
      upload_fields: fields,
      media_url,
    };
  }

  async createSignedReadUrl(
    projectId: string,
    key: string,
    expiresIn?: number,
  ): Promise<string> {
    if (!key.startsWith(`${projectId}/`)) {
      throw new ForbiddenException();
    }
    return await this.storageService.createSignedReadUrl(key, expiresIn);
  }
}
