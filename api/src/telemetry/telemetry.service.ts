import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { shutdownTelemetry, startTelemetry } from './telemetry.sdk';

@Injectable()
export class TelemetryService implements OnModuleInit, OnApplicationShutdown {
  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    startTelemetry(this.config);
  }

  async onApplicationShutdown(): Promise<void> {
    await shutdownTelemetry();
  }
}
