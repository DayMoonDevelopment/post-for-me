import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadUrlResponseDto {
  @ApiProperty({
    description: 'The URL to upload to (PUT for Supabase, POST for R2)',
    type: String,
  })
  upload_url: string;

  @ApiProperty({
    description: 'HTTP method to use for the upload request',
    enum: ['PUT', 'POST'],
  })
  upload_method: 'PUT' | 'POST';

  @ApiProperty({
    description:
      'Additional fields to include in the upload request (populated for presigned-post uploads)',
    type: Object,
  })
  upload_fields: Record<string, string>;

  @ApiProperty({
    description:
      'The public URL for the media, to use once file has been uploaded',
    type: String,
  })
  media_url: string;
}
