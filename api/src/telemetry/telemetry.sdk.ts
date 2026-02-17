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

function getBooleanEnv(
  config: ConfigService,
  name: string,
  defaultValue: boolean,
): boolean {
  const raw = config.get<string>(name);
  if (raw === undefined) {
    return defaultValue;
  }
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') {
    return true;
  }
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') {
    return false;
  }
  return defaultValue;
}

function getOtelUrl(
  config: ConfigService,
  explicit: string | undefined,
  defaultPath: string,
): string | undefined {
  if (explicit && explicit.trim().length > 0) {
    return explicit.trim();
  }

  const base = config.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT');
  if (!base || base.trim().length === 0) {
    return undefined;
  }

  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized}${defaultPath}`;
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

  const enabled = getBooleanEnv(config, 'OTEL_ENABLED', true);
  if (!enabled) {
    return;
  }

  const traceUrl = getOtelUrl(
    config,
    config.get<string>('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'),
    '/v1/traces',
  );
  const logUrl = getOtelUrl(
    config,
    config.get<string>('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'),
    '/v1/logs',
  );

  // If no exporters are configured, keep OpenTelemetry disabled by default.
  if (!traceUrl && !logUrl) {
    return;
  }

  const diagLevel = config
    .get<string>('OTEL_DIAG_LOG_LEVEL')
    ?.trim()
    .toUpperCase();
  if (diagLevel) {
    const mapped: DiagLogLevel | undefined =
      diagLevel === 'ALL'
        ? DiagLogLevel.ALL
        : diagLevel === 'ERROR'
          ? DiagLogLevel.ERROR
          : diagLevel === 'WARN'
            ? DiagLogLevel.WARN
            : diagLevel === 'INFO'
              ? DiagLogLevel.INFO
              : diagLevel === 'DEBUG'
                ? DiagLogLevel.DEBUG
                : diagLevel === 'VERBOSE'
                  ? DiagLogLevel.VERBOSE
                  : diagLevel === 'NONE'
                    ? DiagLogLevel.NONE
                    : undefined;
    if (mapped !== undefined) {
      diag.setLogger(new DiagConsoleLogger(), mapped);
    }
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
          enabled: getBooleanEnv(
            config,
            'OTEL_INSTRUMENTATION_FS_ENABLED',
            false,
          ),
        },
      }),
    ],
  });

  sdk.start();
}
