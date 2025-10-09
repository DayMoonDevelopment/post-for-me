import { Injectable } from '@nestjs/common';
import { PlatformPostDto } from 'src/social-account-feeds/dto/platform-post.dto';

@Injectable()
export class TikTokBusinessService {
  async getAccountFeed(): Promise<PlatformPostDto[]> {}

  async getPost(): Promise<PlatformPostDto> {}
}
