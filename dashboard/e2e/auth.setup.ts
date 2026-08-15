import { expect, test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "./fixtures/env";
import { STORAGE_STATE } from "./fixtures/paths";
import { ensureE2EUser } from "./fixtures/scenario";

/**
 * Signs the e2e user in through the app's own password form and serializes the
 * resulting cookie jar, so specs start authenticated.
 *
 * A setup *project* rather than `globalSetup`: Playwright runs `globalSetup`
 * before it starts `webServer`, so signing in there raced the dev server and
 * timed out waiting for a page that wasn't being served yet. Setup projects run
 * as ordinary tests, which is strictly after the server is up.
 *
 * Driving the real form rather than hand-writing Supabase's session cookies:
 * @supabase/ssr chunks and encodes them in a format that is easy to get subtly
 * wrong, and a hand-rolled jar would be testing our reimplementation of it.
 */
setup("authenticate", async ({ page }) => {
  await ensureE2EUser();
  await mkdir(path.dirname(STORAGE_STATE), { recursive: true });

  await page.goto("/sign-in/password");

  await page.fill('input[name="email"]', E2E_USER_EMAIL);
  await page.fill('input[name="password"]', E2E_USER_PASSWORD);
  await page.click('button[type="submit"]');

  // The app redirects away from /sign-in on success. Waiting on that rather
  // than a specific landing route, which differs by team/project state.
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 30_000,
  });

  await expect(page).toHaveURL(/^(?!.*\/sign-in)/);

  await page.context().storageState({ path: STORAGE_STATE });
});
