import { auditBillingStates } from "~/lib/.server/stripe/billing-state-audit";

/**
 * `GET /billing-states` — the hand-testing launcher for the billing matrix.
 *
 * All of the reading lives in `billing-state-audit`, shared with
 * `scripts/billing-verify.ts`, so the page you test against and the check that
 * gates a PR can never disagree about what they observed.
 *
 * Service-role reads and un-gated access are safe here only because the whole
 * `dev/` group is excluded from the production bundle (see `app/routes.ts`).
 */
export async function loader() {
  return { states: await auditBillingStates() };
}
