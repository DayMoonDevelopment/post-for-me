import { ApiProperty } from '@nestjs/swagger';
import { SocialPostMediaDto } from './post-media.dto';

export class SocialPostChainItemDto {
  @ApiProperty({
    description:
      'Caption for this chain item. Posted as a reply to the previous chain item (or to the root post, for the first item).',
  })
  caption: string;

  @ApiProperty({
    description: 'Array of media associated with this chain item',
    nullable: true,
    required: false,
    type: SocialPostMediaDto,
    isArray: true,
  })
  media?: SocialPostMediaDto[] | null;
}

export class SocialPostChainItemResponseDto extends SocialPostChainItemDto {
  @ApiProperty({ description: 'Unique identifier of the chain item' })
  id: string;

  @ApiProperty({
    description:
      'Position of this chain item in the reply chain, starting at 1',
  })
  sequence: number;
}
