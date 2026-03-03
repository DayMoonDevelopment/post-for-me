import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  defaultResource,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import type { ConfigService } from '@nestjs/config';

let started = false;
let sdk: NodeSDK | undefined;
let loggerProvider: LoggerProvider | undefined;

function parseOtelHeaders(value: string | undefined): Record<string, string> {
  if (!value) {
    return {};
  }

  // OTEL_EXPORTER_OTLP_HEADERS is commonly formatted as: k=v,k2=v2
  const headers: Record<string, string> = {};
  for (const pair of value.split(',')) {
    const trimmed = pair.trim();
    if (!trimmed) {
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!key || !val) {
      continue;
    }
    headers[key] = val;
  }
  return headers;
}

export async function shutdownTelemetry(): Promise<void> {
  const errors: unknown[] = [];

  try {
    await sdk?.shutdown();
  } catch (e) {
    errors.push(e);
  }

  try {
    await loggerProvider?.shutdown();
  } catch (e) {
    errors.push(e);
  }

  if (errors.length > 0) {
    // Last resort: keep it on stderr.
    console.error('[telemetry] shutdown errors', errors);
  }
}

export function startTelemetry(config: ConfigService): void {
  if (started) {
    return;
  }
  started = true;

  const enabled = config.get<boolean>('OTEL_ENABLED');
  if (!enabled) {
    return;
  }

  const traceUrl = config.get<string>('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT');
  const logUrl = config.get<string>('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT');

  // If no exporters are configured, keep OpenTelemetry disabled by default.
  if (!traceUrl && !logUrl) {
    return;
  }

  const diagLevel = config
    .get<string>('OTEL_DIAG_LOG_LEVEL')
    ?.trim()
    .toUpperCase();

  const mapped: DiagLogLevel | undefined =
    DiagLogLevel[diagLevel as keyof typeof DiagLogLevel];

  if (mapped !== undefined) {
    diag.setLogger(new DiagConsoleLogger(), mapped);
  }

  const serviceName =
    config.get<string>('OTEL_SERVICE_NAME') || 'post-for-me-api';
  const serviceVersion =
    config.get<string>('OTEL_SERVICE_VERSION') ||
    config.get<string>('npm_package_version') ||
    undefined;
  const environment =
    config.get<string>('OTEL_ENVIRONMENT') || config.get<string>('NODE_ENV');

  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      ...(serviceVersion ? { [ATTR_SERVICE_VERSION]: serviceVersion } : {}),
      ...(environment
        ? { [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment }
        : {}),
    }),
  );

  const headers = parseOtelHeaders(
    config.get<string>('OTEL_EXPORTER_OTLP_HEADERS'),
  );

  if (logUrl) {
    const exporter = new OTLPLogExporter({ url: logUrl, headers });
    loggerProvider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(exporter)],
    });
    logs.setGlobalLoggerProvider(loggerProvider);
  }

  sdk = new NodeSDK({
    resource,
    traceExporter: traceUrl
      ? new OTLPTraceExporter({ url: traceUrl, headers })
      : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Avoid noisy fs spans by default. Can be re-enabled via env.
        '@opentelemetry/instrumentation-fs': {
          enabled: config.get<boolean>('OTEL_INSTRUMENTATION_FS_ENABLED'),
        },
      }),
    ],
  });

  sdk.start();
}
