import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { MediaTusService } from './media-tus.service';
import { Protect } from '../../auth/protect.decorator';
import { tusUploadDescription } from './docs/tus-upload.md';

@Controller('media/tus')
@ApiTags('Media')
@ApiBearerAuth()
@Protect()
export class MediaTusController {
  constructor(private readonly mediaTusService: MediaTusService) {}

  @ApiOperation({
    summary: 'Resumable upload (TUS protocol, R2 only)',
    description: tusUploadDescription,
  })
  @All(['', '/*splat'])
  async handleTus(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    await this.mediaTusService.handle(req, res);
  }
}
