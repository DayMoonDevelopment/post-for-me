import { chromium } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";

import type { Database } from "~/lib/.server/supabase.types";

import { createSupabaseServerClient } from "~/lib/.server/supabase";

import {
  AUTH_DIR,
  E2E_TEST_EMAIL,
  FIXTURE_PATH,
  STORAGE_STATE_PATH,
} from "./constants";

/**
 * Runs once before the suite. Seeds one deterministic e2e user. Its team and
 * project are provisioned automatically by the DB the moment the user row
 * exists (see api/supabase/migrations/20250529150307_add_team_for_new_user.sql
 * and 20250604123638_projects.sql — a fresh user always gets one "My Team"
 * with one "New Project"), so this only has to look them up, not insert them.
 *
 * It then mints an authenticated Playwright `storageState` for flow specs
 * that need to start already logged in — future tests can do
 * `test.use({ storageState: STORAGE_STATE_PATH })` instead of re-driving the
 * OTP UI. `login.spec.ts` itself does NOT use this: it drives the real OTP
 * form against this same seeded email, so this setup's job there is only
 * making sure the account (and its landing project) already exists.
 */
export default async function globalSetup(): Promise<void> {
  const admin = createClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const userId = await ensureTestUser(admin, E2E_TEST_EMAIL);
  const { teamId, projectId } = await lookupTeamAndProject(admin, userId);

  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(
    FIXTURE_PATH,
    JSON.stringify(
      { email: E2E_TEST_EMAIL, projectId, teamId, userId },
      null,
      2,
    ),
  );

  await mintAuthenticatedStorageState(admin, E2E_TEST_EMAIL);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} must be set to run the e2e suite — point it at your local ` +
        `Supabase (see api/supabase/config.toml).`,
    );
  }
  return value;
}

async function ensureTestUser(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const existing = data.users.find((user) => user.email === email);
  if (existing) return existing.id;

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw (
      created.error ?? new Error(`failed to create e2e test user ${email}`)
    );
  }
  return created.data.user.id;
}

async function lookupTeamAndProject(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<{ projectId: string; teamId: string }> {
  const team = await admin
    .from("teams")
    .select("id")
    .eq("created_by", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (team.error) throw team.error;
  if (!team.data) {
    throw new Error(
      `e2e user ${userId} has no team — expected the on_user_created trigger to create one`,
    );
  }

  const project = await admin
    .from("projects")
    .select("id")
    .eq("team_id", team.data.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (project.error) throw project.error;
  if (!project.data) {
    throw new Error(
      `e2e team ${team.data.id} has no project — expected create_project_after_team_insert to create one`,
    );
  }

  return { projectId: project.data.id, teamId: team.data.id };
}

/**
 * Mints a real session for the seeded user without emailing anything (a
 * magic link the admin API generates but never sends), then runs it through
 * the app's OWN cookie-writing code (`createSupabaseServerClient`) so the
 * resulting storageState cookie is byte-identical to what a real browser
 * login would produce, rather than a hand-rolled reimplementation of
 * `@supabase/ssr`'s cookie format/naming.
 */
async function mintAuthenticatedStorageState(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<void> {
  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (generated.error) throw generated.error;
  const hashedToken = generated.data.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error(`generateLink for ${email} returned no hashed_token`);
  }

  const anon = createClient<Database>(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_PUBLISHABLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const verified = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken,
  });
  if (verified.error || !verified.data.session) {
    throw verified.error ?? new Error(`could not mint a session for ${email}`);
  }

  const responseHeaders = new Headers();
  const fakeRequest = new Request(devServerURL());
  const serverClient = createSupabaseServerClient(fakeRequest, responseHeaders);
  await serverClient.auth.setSession({
    access_token: verified.data.session.access_token,
    refresh_token: verified.data.session.refresh_token,
  });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies(
    responseHeaders
      .getSetCookie()
      .map((setCookie) => parseSetCookie(setCookie, devServerURL())),
  );
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

function devServerURL(): string {
  return `http://localhost:${Number(process.env.PORT) || 7361}`;
}

/** Pulls the `name=value` pair out of a raw Set-Cookie header string — the
 * attributes (Path, HttpOnly, ...) don't matter for Playwright's cookie jar,
 * only that the browser sends the right value back on the next request. */
function parseSetCookie(
  setCookie: string,
  url: string,
): { name: string; url: string; value: string } {
  const [pair] = setCookie.split(";");
  const eq = pair.indexOf("=");
  return {
    name: pair.slice(0, eq).trim(),
    value: pair.slice(eq + 1).trim(),
    url,
  };
}
