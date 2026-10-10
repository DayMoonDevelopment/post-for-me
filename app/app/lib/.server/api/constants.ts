/**
 * Config for talking to the real Post For Me API. `API_URL` is the API origin
 * the dashboard proxies user actions to (override for local API dev); the temp
 * key is cached per-project in an httpOnly cookie named
 * `${TMP_API_KEY_COOKIE_PREFIX}_<projectId>`.
 */
export const API_URL = process.env.API_URL ?? "https://api.postforme.dev";

export const TMP_API_KEY_COOKIE_PREFIX = "tmp_api_key";
