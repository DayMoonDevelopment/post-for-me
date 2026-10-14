import { requireUnkey } from "~/lib/.server/api/unkey";
import { getBillingSummary } from "~/lib/.server/stripe/billing-summary";
import { stripe } from "~/lib/.server/stripe/client";
import { createSupabaseServiceRoleClient } from "~/lib/.server/supabase";

import type { BillingView, KeyState } from "./billing-states";

/** Prefix `billing-seed.ts` gives every fixture team. */
export const SEED_PREFIX = "team_ST_";

/** Teams resolved at once. Each team costs several Stripe reads, and firing all
 * 24 in parallel trips Stripe's rate limiter outright. */
const TEAM_CONCURRENCY = 4;

export interface ProjectKeys {
  disabled: number;
  enabled: number;
  isSystem: boolean;
  projectId: string;
  /** Unkey couldn't be read — the counts are unknown, not zero. */
  unreadable: boolean;
}

export interface ObservedState {
  keys: ProjectKeys[];
  name: string;
  /** Leading number in the seeded team name — the key into BILLING_STATES. */
  number: number;
  /** Values that legitimately move between runs. Reported, never asserted. */
  reported: {
    invoiceTotal: null | number;
    planName: null | string;
    postLimit: null | number;
    usageUsed: null | number;
  };
  status: null | string;
  teamId: string;
  view: BillingView;
}

/** "04 · Legacy, no add-on, active" → 4 */
function stateNumber(name: string): number {
  return Number.parseInt(name.slice(0, 2), 10);
}

/** Collapse a project's key tallies into the same vocabulary the manifest uses.
 * `untouched` can't be distinguished from `enabled` by counting alone — a key
 * that was never swept looks exactly like one deliberately left on — so the
 * manifest treats both as "not disabled" and the distinction stays prose. */
export function keyStateOf(projects: ProjectKeys[]): KeyState | null {
  if (projects.length === 0) return null;
  if (projects.some((project) => project.unreadable)) return null;
  const enabled = projects.reduce((sum, p) => sum + p.enabled, 0);
  const disabled = projects.reduce((sum, p) => sum + p.disabled, 0);
  if (enabled === 0 && disabled === 0) return null;
  return enabled > 0 ? "enabled" : "disabled";
}

/** Every key under a project, tallied. Read-only — the webhook sweep owns
 * writes; an audit that mutated state would be measuring itself. */
async function readProjectKeys(
  projectId: string,
  isSystem: boolean,
): Promise<ProjectKeys> {
  const row: ProjectKeys = {
    projectId,
    isSystem,
    enabled: 0,
    disabled: 0,
    unreadable: false,
  };
  try {
    const { unkey, apiId } = requireUnkey();
    const iterator = await unkey.apis.listKeys({
      apiId,
      externalId: projectId,
      limit: 100,
      revalidateKeysCache: true,
    });
    for await (const page of iterator) {
      for (const key of page.result.data) {
        if (key.enabled) row.enabled += 1;
        else row.disabled += 1;
      }
    }
  } catch {
    row.unreadable = true;
  }
  return row;
}

/** `Promise.all` with a ceiling — workers pull from a shared cursor, so a slow
 * team doesn't stall the ones behind it the way fixed chunking would. */
async function mapWithConcurrency<In, Out>(
  items: In[],
  limit: number,
  fn: (item: In) => Promise<Out>,
): Promise<Out[]> {
  const results = new Array<Out>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

/**
 * Read every seeded billing fixture: which view the page will render, the live
 * Stripe status, and the API keys access actually landed on.
 *
 * The view comes from `getBillingSummary` — the page's own read — so this
 * measures what a user would see rather than re-deriving it. Key tallies come
 * straight from Unkey, which is the only way to observe the churn sweep's
 * effect; it is invisible everywhere in the UI.
 *
 * Shared by `/billing-states` and `scripts/billing-verify.ts` so the launcher
 * and the regression check can never disagree about what they're looking at.
 */
export async function auditBillingStates(): Promise<ObservedState[]> {
  const supabase = createSupabaseServiceRoleClient();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, billing_email, stripe_customer_id")
    .like("id", `${SEED_PREFIX}%`)
    .order("name");
  if (error) throw error;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, team_id, is_system")
    .in("team_id", (teams ?? []).map((team) => team.id));

  return mapWithConcurrency(
    teams ?? [],
    TEAM_CONCURRENCY,
    async (team): Promise<ObservedState> => {
      const owned = (projects ?? []).filter(
        (project) => project.team_id === team.id,
      );

      const [summary, subscriptions, keys] = await Promise.all([
        getBillingSummary({
          billingEmail: team.billing_email,
          stripeCustomerId: team.stripe_customer_id,
        }),
        team.stripe_customer_id
          ? stripe.subscriptions.list({
              customer: team.stripe_customer_id,
              status: "all",
              limit: 10,
            })
          : null,
        mapWithConcurrency(owned, 4, (project) =>
          readProjectKeys(project.id, project.is_system ?? false),
        ),
      ]);

      const live = subscriptions?.data.find(
        (subscription) => subscription.status !== "canceled",
      );

      return {
        teamId: team.id,
        name: team.name,
        number: stateNumber(team.name),
        status: live?.status ?? null,
        // The VIEW question — which page shape rendered — so it reads
        // `hasTierData`, not the declared `isLegacy` that drives the pitch.
        view: !summary.subscription
          ? "empty"
          : summary.plan?.hasTierData
            ? "tier"
            : "legacy",
        keys,
        reported: {
          planName: summary.plan?.name ?? null,
          postLimit: summary.plan?.postLimit ?? null,
          usageUsed: summary.usage?.used ?? null,
          invoiceTotal: summary.upcomingInvoice?.total ?? null,
        },
      };
    },
  );
}
