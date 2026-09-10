import type { ConfigService } from '@nestjs/config';
import type { SupabaseService } from '../supabase/supabase.service';
import { FacebookService } from './facebook.service';
import type { FacebookPost } from './facebook.types';

interface FacebookServiceTestAccess {
  getVideoTargetId(post: FacebookPost): string | undefined;
}

function asTestAccess(service: FacebookService): FacebookServiceTestAccess {
  return service as unknown as FacebookServiceTestAccess;
}

function makeConfigService(): ConfigService {
  return { get: jest.fn() } as unknown as ConfigService;
}

describe('FacebookService', () => {
  let service: FacebookService;

  beforeEach(() => {
    service = new FacebookService({} as SupabaseService, makeConfigService());
  });

  describe('getVideoTargetId', () => {
    it('extracts the video target id from a top-level video attachment', () => {
      const post: FacebookPost = {
        id: '123_456',
        created_time: '2026-01-01T00:00:00Z',
        attachments: {
          data: [{ media_type: 'video', target: { id: 'video_789' } }],
        },
      };

      expect(asTestAccess(service).getVideoTargetId(post)).toBe('video_789');
    });

    it('extracts the video target id from a carousel subattachment', () => {
      const post: FacebookPost = {
        id: '123_456',
        created_time: '2026-01-01T00:00:00Z',
        attachments: {
          data: [
            {
              media_type: 'album',
              subattachments: {
                data: [
                  { media_type: 'photo', target: { id: 'photo_1' } },
                  { media_type: 'video', target: { id: 'video_2' } },
                ],
              },
            },
          ],
        },
      };

      expect(asTestAccess(service).getVideoTargetId(post)).toBe('video_2');
    });

    it('returns undefined for a text/photo post with no video attachment', () => {
      const post: FacebookPost = {
        id: '123_456',
        created_time: '2026-01-01T00:00:00Z',
        attachments: {
          data: [{ media_type: 'photo', target: { id: 'photo_1' } }],
        },
      };

      expect(asTestAccess(service).getVideoTargetId(post)).toBeUndefined();
    });

    it('returns undefined when there are no attachments', () => {
      const post: FacebookPost = {
        id: '123_456',
        created_time: '2026-01-01T00:00:00Z',
      };

      expect(asTestAccess(service).getVideoTargetId(post)).toBeUndefined();
    });
  });
});
