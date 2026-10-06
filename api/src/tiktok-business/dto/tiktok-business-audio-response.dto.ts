import type { TikTokBusinessAudioPlatformDataDto } from './tiktok-business-audio.dto';

/** GET /open_api/v1.3/discovery/cml/trending_list/; no pagination fields. */
export interface TikTokBusinessAudioResponse {
  code: number;
  message: string;
  request_id?: string;
  data?: {
    list?: TikTokBusinessAudioPlatformDataDto[] | null;
  } | null;
}
