import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import type { SupabaseService } from '../supabase/supabase.service';
import { createSupabaseStorageMock } from '../test-utils/supabase-storage-mock';
import { MediaService } from './media.service';

interface StorageResult {
  data: { signedUrl: string } | null;
  error: Error | null;
}

describe('MediaService', () => {
  const projectId = 'project-123';

  function buildService({
    storageResult,
    baseStorageUrl,
  }: {
    storageResult: StorageResult;
    baseStorageUrl?: string;
  }) {
    const storageMock = createSupabaseStorageMock(storageResult);
    const supabaseService = {
      supabaseClient: { storage: storageMock },
    } as unknown as SupabaseService;

    const configService = {
      get: vi.fn().mockReturnValue(baseStorageUrl),
    } as unknown as ConfigService;

    return {
      service: new MediaService(supabaseService, configService),
      storageMock,
    };
  }

  describe('createUploadUrl', () => {
    it('returns an upload_url and a media_url built from the default base storage url', async () => {
      const { service } = buildService({
        storageResult: {
          data: { signedUrl: 'https://storage.example.com/signed' },
          error: null,
        },
      });

      const result = await service.createUploadUrl(projectId);

      expect(result.upload_url).toBe('https://storage.example.com/signed');
      expect(result.media_url).toMatch(
        new RegExp(
          `^https://data.postforme.dev/storage/v1/object/public/post-media/${projectId}/[0-9a-f]{24}$`,
        ),
      );
    });

    it('calls storage.from with the post-media bucket', async () => {
      const { service, storageMock } = buildService({
        storageResult: {
          data: { signedUrl: 'https://storage.example.com/signed' },
          error: null,
        },
      });

      await service.createUploadUrl(projectId);

      expect(storageMock.from).toHaveBeenCalledWith('post-media');
    });

    it('uses a custom BASE_STORAGE_URL when configured', async () => {
      const { service } = buildService({
        storageResult: {
          data: { signedUrl: 'https://storage.example.com/signed' },
          error: null,
        },
        baseStorageUrl: 'https://custom.example.com/media',
      });

      const result = await service.createUploadUrl(projectId);

      expect(result.media_url).toMatch(
        new RegExp(
          `^https://custom.example.com/media/${projectId}/[0-9a-f]{24}$`,
        ),
      );
    });

    it('throws when the signed URL request returns an error', async () => {
      const { service } = buildService({
        storageResult: { data: null, error: new Error('signing failed') },
      });

      await expect(service.createUploadUrl(projectId)).rejects.toThrow(
        'signing failed',
      );
    });

    it('throws when the signed URL request returns no data and no error', async () => {
      const { service } = buildService({
        storageResult: { data: null, error: null },
      });

      await expect(service.createUploadUrl(projectId)).rejects.toThrow(
        'Signed URL not found',
      );
    });
  });
});
