import { ApiProperty } from '@nestjs/swagger';

export class TikTokPostPlatformDataDto {
  @ApiProperty({ description: 'Title of the post' })
  title: string;
}
