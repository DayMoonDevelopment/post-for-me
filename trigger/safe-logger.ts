import { logger } from "@trigger.dev/sdk";
import { redactSecrets } from "./redact-secrets";

export const safeLogger = {
  log: (message: string, properties?: Record<string, unknown>) =>
    logger.log(...redactSecrets([message, properties] as const)),
  info: (message: string, properties?: Record<string, unknown>) =>
    logger.info(...redactSecrets([message, properties] as const)),
  debug: (message: string, properties?: Record<string, unknown>) =>
    logger.debug(...redactSecrets([message, properties] as const)),
  warn: (message: string, properties?: Record<string, unknown>) =>
    logger.warn(...redactSecrets([message, properties] as const)),
  error: (message: string, properties?: Record<string, unknown>) =>
    logger.error(...redactSecrets([message, properties] as const)),
};
