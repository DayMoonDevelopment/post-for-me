import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import {
  MediaStorageService,
  type UploadCredentials,
} from '../media/media-storage.service';

@Injectable()
export class R2MediaStorageService extends MediaStorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly maxUploadBytes: number;

  constructor(private readonly configService: ConfigService) {
    super();
    const accountId = this.configService.getOrThrow<string>('R2_ACCOUNT_ID');
    const accessKeyId =
      this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>(
      'R2_SECRET_ACCESS_KEY',
    );

    this.bucket = this.configService.getOrThrow<string>('R2_BUCKET_NAME');
    this.publicUrl = this.configService.getOrThrow<string>('R2_PUBLIC_URL');
    this.maxUploadBytes = this.configService.get<number>(
      'MAX_UPLOAD_SIZE_BYTES',
      100 * 1024 * 1024,
    );

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async createUploadCredentials(
    key: string,
    contentType: string,
  ): Promise<UploadCredentials> {
    const { url, fields } = await createPresignedPost(this.s3Client, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, this.maxUploadBytes],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: 3600,
    });

    return { url, method: 'POST', fields };
  }

  async createSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
