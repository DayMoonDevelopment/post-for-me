import { createClient } from "@supabase/supabase-js";
import { Unkey } from "@unkey/api";

import {
  E2E_STRIPE_PRICE_ID,
  E2E_USER_EMAIL,
  E2E_USER_PASSWORD,
  PRICING_TIER_PRODUCT_IDS,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  UNKEY_API_ID,
  UNKEY_ROOT_KEY,
} from "./env";
import { stripe } from "./stripe-webhook";

import type Stripe from "stripe";
import type { Database } from "../../app/lib/.server/database.types";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

export const unkey = new Unkey({ rootKey: UNKEY_ROOT_KEY });

export type Scenario = {
  userId: string;
  teamId: string;
  projectId: string;
  systemProjectId: string;
  stripeCustomerId: string;
  subscriptionId: string;
  keyId: string;
  cleanup: () => Promise<void>;
};

let cachedPriceId: string | null = null;

/**
 * The price subscriptions are created against.
 *
 * Prefers an explicit E2E_STRIPE_PRICE_ID, but falls back to discovering a
 * recurring price on one of the pricing-tier products the app is already
 * configured with — so a standard dashboard `.env` runs this suite as-is.
 */
export async function resolveTestPriceId(): Promise<string> {
  if (E2E_STRIPE_PRICE_ID) return E2E_STRIPE_PRICE_ID;
  if (cachedPriceId) return cachedPriceId;

  if (PRICING_TIER_PRODUCT_IDS.length === 0) {
    throw new Error(
      "No STRIPE_PRICING_TIER_*_PRODUCT_ID is configured, so there's no plan to subscribe the test customer to. Set one, or set E2E_STRIPE_PRICE_ID explicitly.",
    );
  }

  for (const productId of PRICING_TIER_PRODUCT_IDS) {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      type: "recurring",
      limit: 1,
    });

    if (prices.data.length > 0) {
      cachedPriceId = prices.data[0].id;
      return cachedPriceId;
    }
  }

  throw new Error(
    `None of the configured pricing-tier products (${PRICING_TIER_PRODUCT_IDS.join(", ")}) has an active recurring price in this Stripe account. Set E2E_STRIPE_PRICE_ID explicitly.`,
  );
}

/** The seeded e2e user, created once and reused across runs. */
export async function ensureE2EUser(): Promise<string> {
  const existing = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = existing.data?.users.find((u) => u.email === E2E_USER_EMAIL);

  if (found) return found.id;

  const created = await supabase.auth.admin.createUser({
    email: E2E_USER_EMAIL,
    password: E2E_USER_PASSWORD,
    email_confirm: true,
  });

  if (created.error || !created.data.user) {
    throw new Error(`Failed to create e2e user: ${created.error?.message}`);
  }

  return created.data.user.id;
}

/**
 * Provisions a complete, isolated billing scenario: a team with both a normal
 * and a system project, a real Stripe test-mode customer on an active
 * subscription, and a real Unkey key per project.
 *
 * Everything is real because the code under test reads all three systems. The
 * only thing faked anywhere in this suite is Stripe's *delivery* of the event —
 * never its state.
 */
export async function createScenario(): Promise<Scenario> {
  const userId = await ensureE2EUser();
  const suffix = Date.now().toString(36);

  const team = await supabase
    .from("teams")
    .insert({
      name: `E2E Churn Team ${suffix}`,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (team.error) throw new Error(`Failed to seed team: ${team.error.message}`);
  const teamId = team.data.id;

  // Inserting the team fires two triggers (20250528201950_teams.sql and
  // 20250604123638_projects.sql): one adds created_by to team_users, the other
  // creates the team's first project. Since
  // 20251215100124_set_first_project_as_system.sql that first project is a
  // *system* (quickstart) project, so it's read back as the system one and the
  // white-label project is inserted separately. Reading rather than
  // re-inserting keeps the scenario matching real provisioning.
  const systemProject = await supabase
    .from("projects")
    .select("id")
    .eq("team_id", teamId)
    .eq("is_system", true)
    .limit(1)
    .single();

  if (systemProject.error) {
    throw new Error(
      `Expected an auto-provisioned system project for team ${teamId}: ${systemProject.error.message}`,
    );
  }

  const systemProjectId = systemProject.data.id;

  const project = await supabase
    .from("projects")
    .insert({
      name: `E2E Project ${suffix}`,
      team_id: teamId,
      created_by: userId,
      updated_by: userId,
      is_system: false,
    })
    .select("id")
    .single();

  if (project.error) {
    throw new Error(`Failed to seed project: ${project.error.message}`);
  }

  const projectId = project.data.id;

  const customer = await stripe.customers.create({
    email: E2E_USER_EMAIL,
    name: `E2E Churn ${suffix}`,
    metadata: { team_id: teamId, e2e: "true" },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: await resolveTestPriceId() }],
    // Skip the payment method dance — the suite is about entitlement state,
    // not card collection.
    trial_period_days: 30,
  });

  const linked = await supabase
    .from("teams")
    .update({ stripe_customer_id: customer.id })
    .eq("id", teamId);

  if (linked.error) {
    throw new Error(`Failed to link customer: ${linked.error.message}`);
  }

  const key = await unkey.keys.createKey({
    apiId: UNKEY_API_ID,
    prefix: "pfm_live",
    name: "E2E API Key",
    externalId: projectId,
    meta: { project_id: projectId, team_id: teamId, created_by: userId },
    enabled: true,
    recoverable: false,
  });

  const keyId = key.data.keyId;

  return {
    userId,
    teamId,
    projectId,
    systemProjectId,
    stripeCustomerId: customer.id,
    subscriptionId: subscription.id,
    keyId,
    cleanup: async () => {
      await unkey.keys.deleteKey({ keyId }).catch(() => {});
      await stripe.subscriptions
        .cancel(subscription.id)
        .catch(() => {});
      await stripe.customers.del(customer.id).catch(() => {});
      // Projects and memberships cascade from the team.
      await supabase.from("teams").delete().eq("id", teamId);
    },
  };
}

export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function isKeyEnabled(keyId: string): Promise<boolean> {
  const key = await unkey.keys.getKey({ keyId, decrypt: false });
  return Boolean(key.data?.enabled);
}

export async function countProjectKeys(projectId: string): Promise<number> {
  const keys = await unkey.apis.listKeys({
    apiId: UNKEY_API_ID,
    externalId: projectId,
    limit: 100,
    revalidateKeysCache: true,
  });

  return keys.data?.length ?? 0;
}
