import { ConsoleLogger, type ConsoleLoggerOptions } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

type LogMeta = Record<string, unknown>;

type AttributePrimitive = string | number | boolean;
type AttributeValue = AttributePrimitive | AttributePrimitive[];

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function normalizeAttributes(
  meta: LogMeta | undefined,
): Record<string, AttributeValue> {
  if (!meta) {
    return {};
  }

  const attributes: Record<string, AttributeValue> = {};

  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined) {
      continue;
    }
    if (
      v === null ||
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      attributes[k] = v === null ? 'null' : v;
      continue;
    }
    if (isError(v)) {
      attributes[`${k}.message`] = v.message;
      attributes[`${k}.type`] = v.name;
      if (v.stack) {
        attributes[`${k}.stack`] = v.stack;
      }
      continue;
    }
    if (Array.isArray(v)) {
      const isPrimitiveArray = v.every(
        (x) => x === null || ['string', 'number', 'boolean'].includes(typeof x),
      );
      if (isPrimitiveArray) {
        attributes[k] = (v as Array<AttributePrimitive | null>).map((x) =>
          x === null ? 'null' : x,
        );
      } else {
        attributes[k] = safeJson(v);
      }
      continue;
    }

    attributes[k] = safeJson(v);
  }

  return attributes;
}

function getTraceAttributes(): Record<string, AttributeValue> {
  const span = trace.getActiveSpan();
  const ctx = span?.spanContext();
  if (!ctx || !ctx.traceId || !ctx.spanId) {
    return {};
  }

  return {
    trace_id: ctx.traceId,
    span_id: ctx.spanId,
    trace_flags: ctx.traceFlags.toString(16).padStart(2, '0'),
  };
}

function severityForLevel(
  level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
): SeverityNumber {
  switch (level) {
    case 'error':
      return SeverityNumber.ERROR;
    case 'warn':
      return SeverityNumber.WARN;
    case 'debug':
      return SeverityNumber.DEBUG;
    case 'verbose':
      return SeverityNumber.TRACE;
    case 'log':
    default:
      return SeverityNumber.INFO;
  }
}

export class AppLogger extends ConsoleLogger {
  private readonly otelLogger = logs.getLogger('app');
  private readonly logToConsole: boolean;

  constructor(
    context?: string,
    options?: ConsoleLoggerOptions & { logToConsole?: boolean },
  ) {
    const { logToConsole = false, ...consoleOptions } = options ?? {};
    super(context ?? 'App', consoleOptions);
    this.logToConsole = logToConsole;
  }

  override log(message: unknown, context?: string): void {
    this.emit('log', message, undefined, context);
    if (this.logToConsole) {
      super.log(message as never, context);
    }
  }

  override error(
    message: unknown,
    stackOrContext?: string,
    context?: string,
  ): void {
    const stack =
      stackOrContext && stackOrContext.includes('\n')
        ? stackOrContext
        : undefined;
    const ctx = stack ? context : stackOrContext;
    this.emit('error', message, stack, ctx);
    if (this.logToConsole) {
      super.error(message as never, stackOrContext, context);
    }
  }

  override warn(message: unknown, context?: string): void {
    this.emit('warn', message, undefined, context);
    if (this.logToConsole) {
      super.warn(message as never, context);
    }
  }

  override debug(message: unknown, context?: string): void {
    this.emit('debug', message, undefined, context);
    if (this.logToConsole) {
      super.debug(message as never, context);
    }
  }

  override verbose(message: unknown, context?: string): void {
    this.emit('verbose', message, undefined, context);
    if (this.logToConsole) {
      super.verbose(message as never, context);
    }
  }

  info(message: string, meta?: LogMeta): void {
    this.emit('log', message, undefined, this.context, meta);
    if (this.logToConsole) {
      super.log(message as never);
    }
  }

  warnWithMeta(message: string, meta?: LogMeta): void {
    this.emit('warn', message, undefined, this.context, meta);
    if (this.logToConsole) {
      super.warn(message as never);
    }
  }

  debugWithMeta(message: string, meta?: LogMeta): void {
    this.emit('debug', message, undefined, this.context, meta);
    if (this.logToConsole) {
      super.debug(message as never);
    }
  }

  errorWithMeta(message: string, error?: unknown, meta?: LogMeta): void {
    const err = isError(error) ? error : undefined;
    const attrs: LogMeta = {
      ...meta,
      ...(err
        ? {
            exception_message: err.message,
            exception_type: err.name,
            exception_stacktrace: err.stack,
          }
        : {}),
    };
    this.emit('error', message, err?.stack, this.context, attrs);
    if (this.logToConsole) {
      super.error(message as never, err?.stack);
    }
  }

  private emit(
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: unknown,
    stack?: string,
    context?: string,
    meta?: LogMeta,
  ): void {
    const body =
      typeof message === 'string'
        ? message
        : message instanceof Error
          ? message.message
          : safeJson(message);

    const attributes: Record<string, AttributeValue> = {
      ...getTraceAttributes(),
      ...normalizeAttributes(meta),
    };

    const effectiveContext = context || this.context;
    if (effectiveContext) {
      attributes['logger.context'] = effectiveContext;
    }

    if (stack) {
      attributes['exception.stacktrace'] = stack;
    }

    try {
      this.otelLogger.emit({
        severityNumber: severityForLevel(level),
        severityText: level.toUpperCase(),
        body,
        attributes: attributes as never,
      });
    } catch {
      // OTel is intentionally best-effort; ConsoleLogger handles local output when enabled.
    }
  }
}
