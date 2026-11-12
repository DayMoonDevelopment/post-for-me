import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Protect } from '../auth/protect.decorator';
import { User } from '../auth/user.decorator';
import type { RequestUser } from '../auth/user.interface';
import { PinterestService } from './pinterest.service';
import { PinterestBoardsQueryDto } from './dto/pinterest-boards-query.dto';
import { PinterestBoardsResponseDto } from './dto/pinterest-board.dto';

@Controller('pinterest')
@ApiTags('Pinterest')
@ApiBearerAuth()
@Protect()
export class PinterestController {
  constructor(private readonly pinterestService: PinterestService) {}

  @Get('boards/:social_account_id')
  @ApiOperation({
    summary: 'List Pinterest boards',
    description:
      "Returns one page of owned boards and group boards where the connected account is a collaborator, unchanged from Pinterest. No privacy or publishability filter is applied. Requires boards:read; visibility (including secret/protected boards) is limited by the connected token's scopes and Pinterest permissions. Follow meta.next to enumerate all accessible boards. Does not discover boards through other ad accounts or Business Access identities.",
  })
  @ApiParam({
    name: 'social_account_id',
    description: 'Connected Pinterest social account ID',
  })
  @ApiOkResponse({ type: PinterestBoardsResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid query or non-Pinterest account.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication failed or the Pinterest account needs reconnecting.',
  })
  @ApiResponse({ status: 403, description: 'Pinterest denied access.' })
  @ApiResponse({
    status: 404,
    description: 'Social account not found in this project.',
  })
  @ApiResponse({ status: 429, description: 'Pinterest rate limit exceeded.' })
  @ApiResponse({ status: 502, description: 'Pinterest request failed.' })
  getBoards(
    @Param('social_account_id') accountId: string,
    @Query() query: PinterestBoardsQueryDto,
    @User() user: RequestUser,
  ): Promise<PinterestBoardsResponseDto> {
    return this.pinterestService.getBoards(accountId, user.projectId, query);
  }
}
