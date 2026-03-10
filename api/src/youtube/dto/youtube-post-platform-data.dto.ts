import { ApiProperty } from '@nestjs/swagger';

export class YouTubePostPlatformDataDto {
  @ApiProperty({ description: 'Title of the post' })
  title: string;
}
