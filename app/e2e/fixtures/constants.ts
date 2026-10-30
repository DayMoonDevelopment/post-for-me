/** Fixed seeded account the whole e2e suite logs in as. Override in CI/local
 * env if a given run needs isolation from other concurrent runs. */
export const E2E_TEST_EMAIL =
  process.env.E2E_TEST_EMAIL ?? "e2e-login@postforme.test";

export const AUTH_DIR = "e2e/.auth";
/** Seeded account/team/project ids, written by global-setup, read by specs. */
export const FIXTURE_PATH = `${AUTH_DIR}/fixture.json`;
/** Authenticated Playwright storageState, for specs that need to start
 * logged in without re-driving the OTP UI (see global-setup.ts). */
export const STORAGE_STATE_PATH = `${AUTH_DIR}/user.json`;

export interface E2eFixture {
  email: string;
  projectId: string;
  teamId: string;
  userId: string;
}
