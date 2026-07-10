import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from '@tus/server';
import type { Request, Response } from 'express';

import { createTusServer } from './tus-server.factory';
import { isR2StorageEnabled } from '../../tracking/posthog';

@Injectable()
export class MediaTusService {
  private readonly tusServer: Server;

  constructor(configService: ConfigService) {
    this.tusServer = createTusServer(configService);
  }

  async handle(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const r2Enabled = await isR2StorageEnabled(user.teamId, user.projectId);

    if (!r2Enabled) {
      res.status(501).json({
        error:
          'Resumable uploads are not available for this account yet. Use POST /v1/media/create-upload-url instead.',
      });
      return;
    }

    await this.tusServer.handle(req, res);
  }
}
