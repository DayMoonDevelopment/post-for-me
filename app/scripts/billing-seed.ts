/**
 * Seeds one local team per BILLING STATE, so every state in
 * `app/lib/.server/stripe/BILLING-STATES.md` can be clicked through for real.
 *
 *   bun run seed:billing                 create / repair every state
 *   bun run seed:billing -- --only tier-over    just one
 *   bun run seed:billing:reset           remove everything it made
 *
 * Each spec below is one row of the matrix. The signed-in user is added to
 * every team so the pages are reachable.
 *
 * ## Time-dependent states
 *
 * `past_due` and `paused` can only be reached by advancing time, so they're
 * seeded on **test clocks** in a second pass (see `CLOCK_SPECS`). Constraints
 * that shape it: 3 customers per clock, advance ≤2 billing periods per call,
 * `test_clock` must be set when the customer is CREATED, and clocks self-delete
 * after 30 days (taking their customers with them).
 *
 * Two verified gotchas:
 *
 * - `pause_collection` is NOT a route to `paused` — it leaves the status
 *   `active`, so the subscription still entitles access. Real `paused` comes
 *   from a trial ending with no payment method and
 *   `trial_settings.end_behavior.missing_payment_method: "pause"`.
 * - **`unpaid` is unreachable on this account.** Dunning is configured to
 *   cancel, so an exhausted retry sequence lands on `canceled`, not `unpaid`
 *   (measured). It's a configuration choice, not a missing fixture — so it
 *   isn't a state our customers can be in unless that setting changes.
 */
import { Unkey } from "@unkey/api";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const LEGACY_PRODUCT = "prod_SOZBcR2BfTeeii";
const ADDON_PRODUCT = "prod_SlroJCx2Q9tL7N";
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "caleb@daymoon.dev";
const METER_EVENT = process.env.STRIPE_METER_EVENT ?? "post_successful";
const BATCH = 100;
const SEED_RUN = process.env.SEED_RUN ?? String(process.pid);

/** What to do to the subscription once it exists. */
type Finish = "cancel" | "cancel_at_period_end" | "none";

interface Spec {
  /** Managed System Credentials alongside the plan. */
  addon?: boolean;
  /** Skip attaching a card — the subscription lands `incomplete`. */
  incomplete?: boolean;
  key: string;
  /** Which plan shape. `none` creates a customer with no subscription. */
  model: "legacy" | "none" | "tier";
  name: string;
  /** Create the customer but never write it to `teams` — the unlinked case. */
  noLink?: boolean;
  /** Don't create a Stripe customer at all. */
  noCustomer?: boolean;
  /** A second, redundant subscription on the same customer. */
  duplicate?: boolean;
  /** Post allowance to subscribe to (tier only). Defaults to the smallest. */
  postLimit?: number;
  /** A quickstart (system) project alongside the white-label one. */
  quickstart?: boolean;
  finish?: Finish;
  /** Start on a trial instead of billing immediately. */
  trialDays?: number;
  /** Posts to record for the period. */
  usage?: number;
  /** Legacy only: add the Volume Discount line item too. */
  volumeDiscount?: boolean;
}

const SPECS: Spec[] = [
  // ── no subscription ────────────────────────────────────────────────────
  { key: "none-never", name: "01 · No customer, never subscribed", model: "none", noCustomer: true },
  { key: "none-churned", name: "02 · Customer, no live subscription", model: "tier", finish: "cancel" },
  { key: "none-incomplete", name: "03 · Checkout started, never paid", model: "tier", incomplete: true },

  // ── legacy ─────────────────────────────────────────────────────────────
  { key: "legacy", name: "04 · Legacy, no add-on, active", model: "legacy", usage: 340 },
  { key: "legacy-addon", name: "05 · Legacy, add-on, active", model: "legacy", addon: true, quickstart: true, usage: 512 },
  { key: "legacy-cancelling", name: "06 · Legacy, no add-on, cancel scheduled", model: "legacy", usage: 120, finish: "cancel_at_period_end" },
  { key: "legacy-addon-cancelling", name: "07 · Legacy, add-on, cancel scheduled", model: "legacy", addon: true, quickstart: true, usage: 120, finish: "cancel_at_period_end" },
  { key: "legacy-cancelled", name: "08 · Legacy, no add-on, canceled", model: "legacy", finish: "cancel" },
  { key: "legacy-addon-cancelled", name: "09 · Legacy, add-on, canceled", model: "legacy", addon: true, quickstart: true, finish: "cancel" },

  // ── tier ───────────────────────────────────────────────────────────────
  { key: "tier-under", name: "13 · Tier, under limit, active", model: "tier", quickstart: true, usage: 120 },
  { key: "tier-nearing", name: "14 · Tier, nearing limit, active", model: "tier", quickstart: true, usage: 850 },
  { key: "tier-over", name: "15 · Tier, over limit, active", model: "tier", quickstart: true, usage: 1050 },
  { key: "tier-top", name: "16 · Tier, top of ladder, active", model: "tier", postLimit: 200000, quickstart: true, usage: 120 },
  { key: "tier-cancelling", name: "17 · Tier, cancel scheduled", model: "tier", quickstart: true, usage: 120, finish: "cancel_at_period_end" },
  { key: "tier-cancelled", name: "18 · Tier, canceled", model: "tier", finish: "cancel" },
  { key: "tier-trialing", name: "21 · Tier, trialing", model: "tier", quickstart: true, trialDays: 14 },

  // ── odd but reachable ──────────────────────────────────────────────────
  { key: "odd-unlinked", name: "26 · Live subscription, team never linked", model: "tier", noLink: true },
  { key: "odd-duplicate", name: "27 · Two live subscriptions", model: "tier", duplicate: true },
  { key: "odd-volume", name: "28 · Legacy + Volume Discount", model: "legacy", volumeDiscount: true, usage: 200 },
  { key: "odd-quickstart", name: "29 · Quickstart project, no add-on", model: "legacy", quickstart: true, usage: 60 },
];

/** States that need time to pass. Grouped into clocks — 3 customers max each. */
interface ClockSpec {
  key: string;
  name: string;
  /** `past_due`: start healthy, swap in a failing card, cross the renewal.
   *  `paused`:   trial with no card, cross the trial end. */
  kind: "past_due" | "paused";
  model: "legacy" | "tier";
  addon?: boolean;
  /** Posts to record BEFORE advancing. Required for a metered-only plan: with
   * zero usage the renewal invoice is $0, Stripe auto-pays it, and the
   * subscription never goes past_due (measured). */
  usage?: number;
}

const CLOCK_SPECS: ClockSpec[] = [
  { key: "tier-past-due", name: "19 · Tier, past due", kind: "past_due", model: "tier" },
  { key: "legacy-past-due", name: "10 · Legacy, no add-on, past due", kind: "past_due", model: "legacy", usage: 200 },
  { key: "legacy-addon-past-due", name: "11 · Legacy, add-on, past due", kind: "past_due", model: "legacy", addon: true },
  { key: "tier-paused", name: "20 · Tier, paused", kind: "paused", model: "tier" },
];
/** Stripe allows 3 customers per clock. */
const CLOCK_GROUP = 3;

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const onlyIndex = args.indexOf("--only");
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : null;
const specs = only ? SPECS.filter((s) => s.key === only) : SPECS;

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });

const teamId = (spec: Spec) => `team_ST_${spec.key.toUpperCase().replace(/-/g, "_")}`;
const clockTeamId = (spec: ClockSpec) =>
  `team_ST_${spec.key.toUpperCase().replace(/-/g, "_")}`;
const projectIds = (spec: Spec) => ({
  whiteLabel: `proj_ST_${spec.key.toUpperCase().replace(/-/g, "_")}_WL`,
  quickstart: `proj_ST_${spec.key.toUpperCase().replace(/-/g, "_")}_QS`,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Stripe rate-limits meter writes hard in the sandbox; backoff isn't optional. */
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status !== 429 || attempt >= 6) throw error;
      const wait = Math.min(2 ** attempt * 1000, 30_000);
      console.log(`      rate limited on ${label}, retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

async function priceForTier(postLimit: number): Promise<string> {
  const products = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ["data.default_price"],
  });
  const product = products.data.find(
    (candidate) => candidate.metadata?.social_post_limit === String(postLimit),
  );
  if (!product?.default_price) throw new Error(`no tier product for ${postLimit}`);
  const price = product.default_price;
  return typeof price === "string" ? price : price.id;
}

/** The legacy price must be METERED and meter-attached, or the subscription
 * bills quantity (1) and every legacy team silently costs $0. */
async function legacyMeteredPrice(): Promise<string> {
  const prices = await stripe.prices.list({
    product: LEGACY_PRODUCT,
    active: true,
    limit: 100,
  });
  const metered = prices.data.filter(
    (price) => price.recurring?.usage_type === "metered" && price.recurring.meter,
  );
  if (metered.length === 0) {
    throw new Error(
      `${LEGACY_PRODUCT} has no active metered price attached to a meter — ` +
        `legacy teams would bill $0`,
    );
  }
  const product = await stripe.products.retrieve(LEGACY_PRODUCT);
  const defaultId =
    typeof product.default_price === "string"
      ? product.default_price
      : product.default_price?.id;
  return (metered.find((price) => price.id === defaultId) ?? metered[0]).id;
}

async function defaultPriceOf(productId: string): Promise<string> {
  const product = await stripe.products.retrieve(productId);
  if (!product.default_price) throw new Error(`${productId} has no default price`);
  return typeof product.default_price === "string"
    ? product.default_price
    : product.default_price.id;
}

/** The Volume Discount product, if it's still around — the third-item case. */
async function volumeDiscountPrice(): Promise<null | string> {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const product = products.data.find((p) => p.name === "Volume Discount");
  if (!product) return null;
  return defaultPriceOf(product.id);
}

async function findCustomer(id: string) {
  const found = await stripe.customers.search({
    query: `metadata['seed_team']:'${id}'`,
    limit: 1,
  });
  return found.data[0] ?? null;
}

async function recordUsage(customerId: string, count: number): Promise<void> {
  if (count <= 0) return;
  const session = await withRetry("meter session", () =>
    stripe.v2.billing.meterEventSession.create({}),
  );
  let sent = 0;
  while (sent < count) {
    const size = Math.min(BATCH, count - sent);
    const offset = sent;
    await withRetry("meter stream", () =>
      stripe.v2.billing.meterEventStream.create(
        {
          events: Array.from({ length: size }, (_, index) => ({
            event_name: METER_EVENT,
            identifier: `seed-${customerId}-${SEED_RUN}-${offset + index}`,
            payload: { stripe_customer_id: customerId, value: "1" },
          })),
        },
        { apiKey: session.authentication_token },
      ),
    );
    sent += size;
    await sleep(400);
  }
  console.log(`      usage ${sent}`);
}

async function ownerUserId(): Promise<null | string> {
  const { data, error } = await db.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((user) => user.email === OWNER_EMAIL)?.id ?? null;
}

// ── reset ────────────────────────────────────────────────────────────────
// ── API keys ──────────────────────────────────────────────────────────────
// A fixture with no Unkey keys makes the access half of every state untestable:
// the sweep has nothing to toggle, so a broken sweep looks identical to a
// working one. Each project gets exactly one key, then the REAL sweep runs so
// the keys converge on whatever the state actually entitles.

const unkeyRootKey = process.env.UNKEY_ROOT_KEY;
const unkeyApiId = process.env.UNKEY_API_ID;
const unkey = unkeyRootKey ? new Unkey({ rootKey: unkeyRootKey }) : null;

if (!unkey || !unkeyApiId) {
  console.warn(
    "\u26a0\ufe0f  UNKEY_ROOT_KEY / UNKEY_API_ID unset \u2014 seeding without API keys." +
      "\n    Billing states will still be correct; key access is untestable.",
  );
}

/** Remove every key under a project, so re-seeding doesn't pile them up. */
async function dropProjectKeys(projectId: string) {
  if (!unkey || !unkeyApiId) return;
  try {
    const iterator = await unkey.apis.listKeys({
      apiId: unkeyApiId,
      externalId: projectId,
      limit: 100,
      revalidateKeysCache: true,
    });
    for await (const page of iterator) {
      for (const key of page.result.data) {
        await unkey.keys.deleteKey({ keyId: key.keyId });
      }
    }
  } catch {
    // No keys, or Unkey unreachable \u2014 nothing to clean up either way.
  }
}

/** One enabled key per project. Enabled is only the starting point: the sweep
 * is what decides whether it stays that way. */
async function mintProjectKeys(projectIds: string[]) {
  if (!unkey || !unkeyApiId) return;
  for (const projectId of projectIds) {
    await dropProjectKeys(projectId);
    await unkey.keys.createKey({
      apiId: unkeyApiId,
      prefix: "pfm_live",
      externalId: projectId,
      name: "Billing state fixture",
      meta: { seed: "billing-states" },
      enabled: true,
      recoverable: false,
    });
  }
}

/** Run the production churn sweep against the fixture \u2014 the same call the
 * `subscription-access` webhook makes. This is what makes the key tallies on
 * /billing-states mean something. */
async function sweep(customerId: string) {
  if (!unkey || !unkeyApiId) return;
  try {
    const { syncApiKeyAccessForCustomer } = await import(
      "../app/lib/.server/subscription-access/sync-api-key-access"
    );
    const result = await syncApiKeyAccessForCustomer(customerId);
    console.log(
      `   sweep \u2192 ${result.enabled ? "enabled" : "disabled"} (${result.keysUpdated} key(s) changed across ${result.projects} project(s))`,
    );
  } catch (error) {
    console.warn(`   \u26a0\ufe0f  sweep failed: ${(error as Error).message}`);
  }
}

if (reset) {
  for (const spec of specs) {
    const id = teamId(spec);
    const customer = await findCustomer(id);
    if (customer) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 20,
      });
      for (const sub of subs.data) {
        if (!["canceled", "incomplete_expired"].includes(sub.status)) {
          await stripe.subscriptions.cancel(sub.id);
        }
      }
      await stripe.customers.del(customer.id);
    }
    const ids = projectIds(spec);
    await dropProjectKeys(ids.whiteLabel);
    await dropProjectKeys(ids.quickstart);
    await db.from("projects").delete().in("id", [ids.whiteLabel, ids.quickstart]);
    await db.from("team_users").delete().eq("team_id", id);
    await db.from("teams").delete().eq("id", id);
    console.log(`removed ${spec.name}`);
  }
  if (!only) {
    for (const clock of (await stripe.testHelpers.testClocks.list({ limit: 50 })).data) {
      // Deleting a clock also deletes its customers and cancels their subs.
      await stripe.testHelpers.testClocks.del(clock.id);
      console.log(`removed test clock ${clock.id}`);
    }
    for (const spec of CLOCK_SPECS) {
      const id = clockTeamId(spec);
      await dropProjectKeys(`${id.replace("team_", "proj_")}_WL`);
      await db.from("projects").delete().eq("team_id", id);
      await db.from("team_users").delete().eq("team_id", id);
      await db.from("teams").delete().eq("id", id);
    }
  }
  console.log("\n✅ states removed");
} else {
  const owner = await ownerUserId();
  if (!owner) {
    console.warn(`⚠️  no auth user ${OWNER_EMAIL} — teams won't be visible in the UI`);
  }

  const legacyPrice = await legacyMeteredPrice();
  const addonPrice = await defaultPriceOf(ADDON_PRODUCT);
  const volumePrice = await volumeDiscountPrice();
  const summary: string[] = [];

  for (const spec of specs) {
    const id = teamId(spec);
    console.log(`\n── ${spec.name}`);

    // 1. Team + projects + membership.
    const ids = projectIds(spec);
    const team = await db
      .from("teams")
      .upsert({ id, name: spec.name, stripe_customer_id: null })
      .select("id")
      .single();
    if (team.error) throw team.error;

    const projects = [
      { id: ids.whiteLabel, team_id: id, name: "White label", is_system: false },
      ...(spec.quickstart
        ? [{ id: ids.quickstart, team_id: id, name: "Quickstart", is_system: true }]
        : []),
    ];
    const wrote = await db.from("projects").upsert(projects);
    if (wrote.error) throw wrote.error;
    await mintProjectKeys(projects.map((project) => project.id));
    if (owner) {
      const member = await db
        .from("team_users")
        .upsert({ team_id: id, user_id: owner });
      if (member.error) throw member.error;
    }

    if (spec.noCustomer) {
      summary.push(`${spec.name} — no customer`);
      console.log(`   supabase only (no Stripe customer)`);
      continue;
    }

    // 2. Customer, with a card unless the spec wants an incomplete subscription.
    let customer = await findCustomer(id);
    customer ??= await stripe.customers.create({
      name: spec.name,
      metadata: { seed_team: id, team_id: id },
    });
    if (!spec.incomplete && !customer.invoice_settings?.default_payment_method) {
      const pm = await stripe.paymentMethods.attach("pm_card_visa", {
        customer: customer.id,
      });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: pm.id },
      });
    }

    // 3. Subscription matching the model.
    const existing = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    const live = existing.data.find((sub) =>
      ["active", "incomplete", "past_due", "trialing"].includes(sub.status),
    );

    let subscription = live ?? null;
    if (!subscription) {
      const items =
        spec.model === "legacy"
          ? [
              { price: legacyPrice },
              ...(spec.addon ? [{ price: addonPrice }] : []),
              ...(spec.volumeDiscount && volumePrice
                ? [{ price: volumePrice }]
                : []),
            ]
          : [{ price: await priceForTier(spec.postLimit ?? 1000) }];

      subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items,
        ...(spec.trialDays ? { trial_period_days: spec.trialDays } : {}),
        ...(spec.incomplete
          ? { payment_behavior: "default_incomplete" as const }
          : {}),
      });

      if (spec.duplicate) {
        await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: await priceForTier(2500) }],
        });
      }
    }

    // 4. Link, unless this is the deliberately-unlinked case.
    if (!spec.noLink) {
      const link = await db
        .from("teams")
        .update({ stripe_customer_id: customer.id })
        .eq("id", id);
      if (link.error) throw link.error;
    }

    // 5. Usage BEFORE any cancellation, so a cancelled state still has history.
    if (spec.usage) await recordUsage(customer.id, spec.usage);

    // 6. Final status.
    if (spec.finish === "cancel_at_period_end") {
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
    } else if (spec.finish === "cancel") {
      await stripe.subscriptions.cancel(subscription.id);
    }

    // The state is final; converge its keys exactly as a webhook would.
    if (!spec.noLink) await sweep(customer.id);

    const final = await stripe.subscriptions.retrieve(subscription.id);
    console.log(
      `   ${customer.id} · ${final.status}${final.cancel_at ? " (cancels " + new Date(final.cancel_at * 1000).toDateString() + ")" : ""}${spec.noLink ? " · UNLINKED" : ""}`,
    );
    summary.push(`${spec.name} — ${final.status}`);
  }

  // ── time-dependent states ────────────────────────────────────────────
  const clockSpecs = only
    ? CLOCK_SPECS.filter((spec) => spec.key === only)
    : CLOCK_SPECS;
  if (clockSpecs.length > 0) {
    const tierPrice = await priceForTier(1000);
    for (let start = 0; start < clockSpecs.length; start += CLOCK_GROUP) {
      const group = clockSpecs.slice(start, start + CLOCK_GROUP);
      const frozen = Math.floor(Date.now() / 1000);
      const clock = await stripe.testHelpers.testClocks.create({
        frozen_time: frozen,
        name: `billing states ${start / CLOCK_GROUP + 1}`,
      });
      console.log(`\n── test clock ${clock.id}`);

      /** Advancing is async — the clock reports `advancing` until it settles. */
      const settle = async () => {
        for (let i = 0; i < 80; i++) {
          const current = await stripe.testHelpers.testClocks.retrieve(clock.id);
          if (current.status === "ready") return current;
          await sleep(3000);
        }
        throw new Error(`clock ${clock.id} never settled`);
      };

      let advanceTo = frozen;
      const made: { customer: string; spec: ClockSpec; subscription: string }[] = [];

      for (const spec of group) {
        const id = clockTeamId(spec);
        const team = await db
          .from("teams")
          .upsert({ id, name: spec.name, stripe_customer_id: null })
          .select("id")
          .single();
        if (team.error) throw team.error;
        const projectId = `${id.replace("team_", "proj_")}_WL`;
        const wrote = await db.from("projects").upsert([
          { id: projectId, team_id: id, name: "White label", is_system: false },
        ]);
        if (wrote.error) throw wrote.error;
        await mintProjectKeys([projectId]);
        if (owner) {
          await db.from("team_users").upsert({ team_id: id, user_id: owner });
        }

        // `test_clock` can only be set at creation — never added later.
        const customer = await stripe.customers.create({
          name: spec.name,
          test_clock: clock.id,
          metadata: { seed_team: id, team_id: id },
        });

        const items =
          spec.model === "legacy"
            ? [
                { price: legacyPrice },
                ...(spec.addon ? [{ price: addonPrice }] : []),
              ]
            : [{ price: tierPrice }];

        let subscription: Stripe.Subscription;
        if (spec.kind === "paused") {
          // No payment method at all: the trial ends and Stripe pauses it.
          subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items,
            trial_period_days: 7,
            trial_settings: { end_behavior: { missing_payment_method: "pause" } },
          });
          advanceTo = Math.max(advanceTo, frozen + 8 * 86400);
        } else {
          // Start healthy on a good card, then swap in one that declines at
          // charge time — the renewal is what fails, not the signup.
          const good = await stripe.paymentMethods.attach("pm_card_visa", {
            customer: customer.id,
          });
          await stripe.customers.update(customer.id, {
            invoice_settings: { default_payment_method: good.id },
          });
          subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items,
          });
          const bad = await stripe.paymentMethods.attach(
            "pm_card_chargeCustomerFail",
            { customer: customer.id },
          );
          await stripe.customers.update(customer.id, {
            invoice_settings: { default_payment_method: bad.id },
          });
          const periodEnd = subscription.items.data[0]?.current_period_end ?? frozen;
          advanceTo = Math.max(advanceTo, periodEnd + 3600);
        }

        const link = await db
          .from("teams")
          .update({ stripe_customer_id: customer.id })
          .eq("id", id);
        if (link.error) throw link.error;

        if (spec.usage) {
          await recordUsage(customer.id, spec.usage);
          // The renewal invoice is only non-zero once the meter has aggregated,
          // so the clock must not move until it has.
          const meters = await stripe.billing.meters.list({ status: "active", limit: 100 });
          const meter = meters.data.find((m) => m.event_name === METER_EVENT);
          const from = subscription.items.data[0]?.current_period_start ?? frozen;
          for (let i = 0; meter && i < 25; i++) {
            const summaries = await stripe.billing.meters.listEventSummaries(meter.id, {
              customer: customer.id,
              start_time: from,
              end_time: Math.floor(Date.now() / 1000),
            });
            if (summaries.data.some((entry) => (entry.aggregated_value || 0) > 0)) break;
            await sleep(5000);
          }
        }

        made.push({ spec, subscription: subscription.id, customer: customer.id });
        console.log(`   ${spec.name} → ${customer.id}`);
      }

      console.log(`   advancing to ${new Date(advanceTo * 1000).toDateString()}…`);
      await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: advanceTo });
      await settle();

      for (const { spec, subscription, customer } of made) {
        await sweep(customer);
        const final = await stripe.subscriptions.retrieve(subscription);
        console.log(`   ${spec.name} → ${final.status}`);
        summary.push(`${spec.name} — ${final.status}`);
      }
    }
  }

  console.log("\n── seeded ──");
  for (const line of summary) console.log(`  ${line}`);
  console.log(
    "\n⚠️  `unpaid` is not seeded: this account's dunning cancels rather than" +
      "\n    marking unpaid, so it isn't a state customers can reach.",
  );
  console.log("Meter summaries lag — re-check usage in a minute if it reads 0.");
}
