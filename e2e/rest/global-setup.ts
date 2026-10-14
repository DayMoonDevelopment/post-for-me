import { loadEnvFiles, requireEnv } from '../lib/env';

export default async function globalSetup(): Promise<void> {
  loadEnvFiles();

  const baseUrl = requireEnv('API_BASE_URL').replace(/\/+$/, '');
  requireEnv('PFM_API_KEY');

  try {
    const res = await fetch(`${baseUrl}/healthcheck`);
    if (res.ok) {
      // eslint-disable-next-line no-console
      console.log(`\n[e2e:rest] target: ${baseUrl}  (healthcheck OK)\n`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `\n[e2e:rest] WARNING: ${baseUrl}/healthcheck returned ${res.status}. ` +
          `Running anyway — individual tests will report the real failures.\n`,
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `\n[e2e:rest] WARNING: could not reach ${baseUrl} ` +
        `(${(err as Error).message}). Is the API running?\n`,
    );
  }
}
