import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Minimal `.env` loader. Reads `e2e/.env.local` then `e2e/.env` into
 * `process.env` WITHOUT overwriting variables that are already set
 * (explicitly exported vars and `.env.local` win over `.env`).
 *
 * Kept dependency-free on purpose — the e2e suite should not pull in `dotenv`
 * just to read a couple of variables. This sibling owns its own env files; it
 * deliberately does not reach into `api/.env.local`.
 */
export function loadEnvFiles(): void {
  // this file lives at e2e/lib/env.ts -> e2e/
  const e2eRoot = join(__dirname, '..');

  for (const file of ['.env.local', '.env']) {
    const path = join(e2eRoot, file);
    if (!existsSync(path)) continue;

    const content = readFileSync(path, 'utf8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq === -1) continue;

      const key = line.slice(0, eq).trim();
      if (!key || key in process.env) continue;

      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

/**
 * Reads a required environment variable, throwing a clear, actionable error
 * if it is missing. Used to fail the whole suite fast rather than letting
 * every test blow up with a confusing network error.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `\nMissing required environment variable: ${name}\n` +
        `The e2e suite refuses to run without it.\n` +
        `Set it in e2e/.env.local or export it before running.\n` +
        `See e2e/README.md and e2e/.env.example.\n`,
    );
  }
  return value.trim();
}

/** Reads an optional environment variable, falling back to `fallback`. */
export function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}
