import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import type { E2eFixture } from "../fixtures/constants";

import {
  E2E_TEST_EMAIL,
  FIXTURE_PATH,
  STORAGE_STATE_PATH,
} from "../fixtures/constants";
import { clearMailbox, fetchLatestOtp } from "../fixtures/mailpit";

async function readFixture(): Promise<E2eFixture> {
  return JSON.parse(await readFile(FIXTURE_PATH, "utf-8")) as E2eFixture;
}

// This suite drives the real /login UI end to end (email -> OTP email ->
// code entry) — the one flow every other authenticated flow depends on. Each
// test gets a fresh, signed-out browser context (Playwright's default).
test.describe("login", () => {
  test("requests an OTP, verifies it, and lands on the seeded project", async ({
    page,
  }) => {
    const fixture = await readFixture();
    await clearMailbox(E2E_TEST_EMAIL);

    await page.goto("/login");
    await page.locator("#email").fill(E2E_TEST_EMAIL);
    // The carousel keeps both slides mounted, so the verify step's "Resend
    // code" button (identical type="submit" value="request" attributes) is
    // also in the DOM — the email step's submit is always first.
    await page
      .locator('button[type="submit"][value="request"]')
      .first()
      .click();

    // Carousel slides to the verify step once the server accepts the email.
    await expect(page.locator("#code")).toBeVisible();

    const code = await fetchLatestOtp(E2E_TEST_EMAIL);
    // pressSequentially dispatches real per-character key events, which the
    // input-otp library needs to update its slots and fire onComplete.
    await page.locator("#code").pressSequentially(code, { delay: 50 });

    // Verify auto-submits on the 6th digit; the app waits ~700ms after a
    // "done" response before navigating (see login-form.tsx).
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });
    await expect(page).toHaveURL(new RegExp(`/projects/${fixture.projectId}`));
  });
});

// Reuses the storageState global-setup mints via the Supabase admin API
// (bypassing the OTP UI) — this both covers the guest guard and, as a side
// effect, proves the injected session cookie is actually valid: a malformed
// bypass cookie would fail to redirect and land back on the login form.
test.describe("guest guard", () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  test("visiting /login while already authenticated redirects into the app", async ({
    page,
  }) => {
    const fixture = await readFixture();

    await page.goto("/login");

    await expect(page).toHaveURL(new RegExp(`/projects/${fixture.projectId}`));
  });
});
