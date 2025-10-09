import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

import type { PaginatedRequestQuery } from '../pagination/pagination-request.interface';

import { PlatformPostQueryDto } from './dto/platform-post-query.dto';
import { PlatformPostDto } from './dto/platform-post.dto';

@Injectable()
export class SocialAccountFeedsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getPlatformPosts(
    queryParams: PlatformPostQueryDto,
    projectId: string,
  ): PaginatedRequestQuery<PlatformPostDto> {
    console.log(queryParams, projectId);
    await Promise.resolve();
    return {
      data: [],
      count: 0,
    };
  }
}
