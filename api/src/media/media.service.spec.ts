import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { MediaService } from './media.service';
import { getStorageProvider } from '../storage/storage.factory';

jest.mock('../storage/storage.factory');

describe('MediaService', () => {
  let service: MediaService;
  let configServiceGet: jest.Mock;
  let mockStorageProvider: {
    createSignedUploadUrl: jest.Mock;
    getPublicUrl: jest.Mock;
  };

  beforeEach(async () => {
    mockStorageProvider = {
      createSignedUploadUrl: jest
        .fn()
        .mockResolvedValue('https://signed.example.com/upload'),
      getPublicUrl: jest
        .fn()
        .mockReturnValue('https://public.example.com/post-media/key'),
    };

    (getStorageProvider as jest.Mock)
      .mockReset()
      .mockResolvedValue(mockStorageProvider);

    configServiceGet = jest.fn().mockReturnValue(undefined);

    const module = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: ConfigService, useValue: { get: configServiceGet } },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  it('derives media_url from the resolved storage provider instead of a hardcoded URL', async () => {
    const result = await service.createUploadUrl('project-1', 'team-1');

    expect(getStorageProvider).toHaveBeenCalledWith('team-1', 'project-1');
    expect(mockStorageProvider.getPublicUrl).toHaveBeenCalledWith(
      'post-media',
      expect.stringContaining('project-1/'),
    );
    expect(result.media_url).toBe('https://public.example.com/post-media/key');
    expect(result.upload_url).toBe('https://signed.example.com/upload');
  });

  it('resolves the public URL against the configured MEDIA_BUCKET', async () => {
    configServiceGet.mockImplementation((key: string) =>
      key === 'MEDIA_BUCKET' ? 'custom-bucket' : undefined,
    );

    await service.createUploadUrl('project-1', 'team-1');

    expect(mockStorageProvider.getPublicUrl).toHaveBeenCalledWith(
      'custom-bucket',
      expect.any(String),
    );
    expect(mockStorageProvider.createSignedUploadUrl).toHaveBeenCalledWith(
      'custom-bucket',
      expect.any(String),
    );
  });

  it('generates a signed upload URL and a public URL for the same key', async () => {
    await service.createUploadUrl('project-1', 'team-1');

    const signedUploadKeyCall = mockStorageProvider.createSignedUploadUrl.mock
      .calls[0] as [string, string];
    const publicUrlKeyCall = mockStorageProvider.getPublicUrl.mock.calls[0] as [
      string,
      string,
    ];
    const [, signedUploadKey] = signedUploadKeyCall;
    const [, publicUrlKey] = publicUrlKeyCall;

    expect(signedUploadKey).toBe(publicUrlKey);
  });
});
