import path from "node:path";

/**
 * Kept in its own module so playwright.config.ts can reference it without
 * pulling in global-setup.ts — which constructs Supabase, Stripe and Unkey
 * clients at import time, and would make merely loading the config require
 * every credential.
 */
export const STORAGE_STATE = path.join(
  import.meta.dirname,
  "..",
  ".auth",
  "user.json",
);
