import type { ConfigService } from '@nestjs/config';
import type { RequestUser } from '../../auth/user.interface';

const mockGetUpload = jest.fn();

jest.mock('@tus/server', () => ({
  Server: jest.fn(),
}));

jest.mock('@tus/s3-store', () => ({
  S3Store: jest.fn().mockImplementation(() => ({
    getUpload: mockGetUpload,
  })),
}));

import { Server } from '@tus/server';
import { S3Store } from '@tus/s3-store';
import { createTusServer, TUS_UPLOAD_PATH } from './tus-server.factory';

const TUS_PART_SIZE_BYTES = 8 * 1024 * 1024;
const TUS_UPLOAD_EXPIRATION_MS = 24 * 60 * 60 * 1000;

type ServerOptions = {
  getFileIdFromRequest: (req: { url: string }) => string | undefined;
  onIncomingRequest: (
    req: {
      method: string;
      headers: { get: (name: string) => string | null };
      runtime?: { node?: { req: { user?: RequestUser } } };
    },
    id: string,
  ) => Promise<void>;
};

type S3StoreOptions = {
  partSize: number;
  minPartSize: number;
  expirationPeriodInMilliseconds: number;
};

const ServerMock = Server as unknown as jest.Mock<unknown, [ServerOptions]>;
const S3StoreMock = S3Store as unknown as jest.Mock<unknown, [S3StoreOptions]>;

function buildOptions(): ServerOptions {
  const configService = {
    get: jest.fn().mockReturnValue('test-bucket'),
  } as unknown as ConfigService;

  createTusServer(configService);

  return ServerMock.mock.calls[0][0];
}

function fakeRequest(overrides: {
  method: string;
  projectId?: string;
  contentLength?: string;
}) {
  return {
    method: overrides.method,
    headers: {
      get: (name: string) =>
        name === 'content-length' ? (overrides.contentLength ?? null) : null,
    },
    runtime: overrides.projectId
      ? {
          node: {
            req: { user: { projectId: overrides.projectId } as RequestUser },
          },
        }
      : undefined,
  };
}

describe('createTusServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.R2_ENDPOINT = 'https://r2.test';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
  });

  it('configures S3Store with the 8MiB uniform part size and a 24h expiration', () => {
    const configService = {
      get: jest.fn().mockReturnValue('test-bucket'),
    } as unknown as ConfigService;

    createTusServer(configService);

    const s3StoreOptions = S3StoreMock.mock.calls[0][0];
    expect(s3StoreOptions.partSize).toBe(TUS_PART_SIZE_BYTES);
    expect(s3StoreOptions.minPartSize).toBe(TUS_PART_SIZE_BYTES);
    expect(s3StoreOptions.expirationPeriodInMilliseconds).toBe(
      TUS_UPLOAD_EXPIRATION_MS,
    );
  });

  describe('getFileIdFromRequest', () => {
    it('recovers the full remainder after the mount path, including slashes', () => {
      const { getFileIdFromRequest } = buildOptions();

      const id = getFileIdFromRequest({
        url: `https://api.test${TUS_UPLOAD_PATH}/project_1/upload-hash`,
      });

      expect(id).toBe('project_1/upload-hash');
    });

    it('returns undefined for a path outside the mount point', () => {
      const { getFileIdFromRequest } = buildOptions();

      const id = getFileIdFromRequest({ url: 'https://api.test/unrelated' });

      expect(id).toBeUndefined();
    });
  });

  describe('onIncomingRequest', () => {
    it('rejects when the upload id does not belong to the caller project', async () => {
      const { onIncomingRequest } = buildOptions();

      await expect(
        onIncomingRequest(
          fakeRequest({ method: 'HEAD', projectId: 'project_1' }),
          'project_2/upload-hash',
        ),
      ).rejects.toMatchObject({ status_code: 403 });
    });

    it('rejects when there is no authenticated user on the request', async () => {
      const { onIncomingRequest } = buildOptions();

      await expect(
        onIncomingRequest(
          fakeRequest({ method: 'HEAD' }),
          'project_1/upload-hash',
        ),
      ).rejects.toMatchObject({ status_code: 403 });
    });

    it('skips chunk-size validation for non-PATCH verbs', async () => {
      const { onIncomingRequest } = buildOptions();

      await onIncomingRequest(
        fakeRequest({ method: 'POST', projectId: 'project_1' }),
        'project_1/upload-hash',
      );

      expect(mockGetUpload).not.toHaveBeenCalled();
    });

    it('rejects a non-final PATCH chunk that is not exactly the part size', async () => {
      const { onIncomingRequest } = buildOptions();
      mockGetUpload.mockResolvedValue({ size: 100 * 1024 * 1024, offset: 0 });

      await expect(
        onIncomingRequest(
          fakeRequest({
            method: 'PATCH',
            projectId: 'project_1',
            contentLength: String(1024 * 1024),
          }),
          'project_1/upload-hash',
        ),
      ).rejects.toMatchObject({ status_code: 400 });
    });

    it('accepts a non-final PATCH chunk that is exactly the part size', async () => {
      const { onIncomingRequest } = buildOptions();
      mockGetUpload.mockResolvedValue({ size: 100 * 1024 * 1024, offset: 0 });

      await expect(
        onIncomingRequest(
          fakeRequest({
            method: 'PATCH',
            projectId: 'project_1',
            contentLength: String(TUS_PART_SIZE_BYTES),
          }),
          'project_1/upload-hash',
        ),
      ).resolves.toBeUndefined();
    });

    it('accepts a final PATCH chunk smaller than the part size', async () => {
      const { onIncomingRequest } = buildOptions();
      // 100MiB upload, offset at 96MiB — 4MiB remaining, less than the 8MiB
      // part size, so this is the final (short) chunk.
      mockGetUpload.mockResolvedValue({
        size: 100 * 1024 * 1024,
        offset: 96 * 1024 * 1024,
      });

      await expect(
        onIncomingRequest(
          fakeRequest({
            method: 'PATCH',
            projectId: 'project_1',
            contentLength: String(4 * 1024 * 1024),
          }),
          'project_1/upload-hash',
        ),
      ).resolves.toBeUndefined();
    });
  });
});
