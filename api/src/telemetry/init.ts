import { ConfigService } from '@nestjs/config';

import { startTelemetry } from './telemetry.sdk';

try {
  // Intentionally best-effort: this file exists to allow early side-effect init.
  // When used this way, ConfigService reads from process.env under the hood.
  startTelemetry(new ConfigService());
} catch (e: unknown) {
  console.error('[telemetry] init failed', e);
}
