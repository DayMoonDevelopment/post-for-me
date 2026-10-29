import { redactSecrets } from './redact-secrets';

export const safeConsole = {
  log: (...args: unknown[]) => console.log(...redactSecrets(args)),
  info: (...args: unknown[]) => console.info(...redactSecrets(args)),
  debug: (...args: unknown[]) => console.debug(...redactSecrets(args)),
  warn: (...args: unknown[]) => console.warn(...redactSecrets(args)),
  error: (...args: unknown[]) => console.error(...redactSecrets(args)),
};
