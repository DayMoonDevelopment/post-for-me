import { ApiProperty } from '@nestjs/swagger';
import { SocialPostMediaDto } from '../../social-posts/dto/post-media.dto';

export class SocialPostResultDto {
  @ApiProperty({ description: 'The unique identifier of the post result' })
  id: string;

  @ApiProperty({ description: 'The ID of the associated social account' })
  social_account_id: string;

  @ApiProperty({ description: 'The ID of the associated post' })
  post_id: string;

  @ApiProperty({ description: 'Indicates if the post was successful' })
  success: boolean;

  @ApiProperty({ description: 'Error message if the post failed' })
  error: string | null;

  @ApiProperty({ description: 'Detailed logs from the post' })
  details: any;

  @ApiProperty({
    description: 'Platform-specific data',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Platform-specific ID' },
      url: { type: 'string', description: 'URL of the posted content' },
    },
  })
  platform_data: {
    id: string | null;
    url: string | null;
  } | null;

  @ApiProperty({
    description: 'Array of media URLs associated with the post',
    nullable: true,
    isArray: true,
    type: SocialPostMediaDto,
  })
  media?: SocialPostMediaDto[] | null;
}
