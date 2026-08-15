import { expect, test } from "@playwright/test";

import {
  countProjectKeys,
  createScenario,
  getSubscription,
  isKeyEnabled,
  resolveTestPriceId,
  supabase,
  type Scenario,
} from "../fixtures/scenario";
import {
  deliverStripeEvent,
  deliverSubscriptionEvent,
  stripe,
} from "../fixtures/stripe-webhook";

// Each spec provisions its own team, Stripe customer and Unkey key, so they
// can't observe each other's churn state.
let scenario: Scenario;

test.beforeEach(async () => {
  scenario = await createScenario();
});

test.afterEach(async () => {
  await scenario?.cleanup();
});

test.describe("subscription access enforcement", () => {
  test("revokes API keys when the subscription is canceled, and restores them on resubscribe", async () => {
    expect(await isKeyEnabled(scenario.keyId)).toBe(true);

    await stripe.subscriptions.cancel(scenario.subscriptionId);
    await deliverSubscriptionEvent(
      "customer.subscription.deleted",
      await getSubscription(scenario.subscriptionId),
    );

    expect(await isKeyEnabled(scenario.keyId)).toBe(false);

    const revived = await stripe.subscriptions.create({
      customer: scenario.stripeCustomerId,
      items: [{ price: await resolveTestPriceId() }],
      trial_period_days: 30,
    });
    await deliverSubscriptionEvent("customer.subscription.created", revived);

    expect(await isKeyEnabled(scenario.keyId)).toBe(true);
  });

  // The core of PFM-936's D2: the handler must ignore the status on the event
  // and re-read live Stripe state, or a replayed delivery resurrects access.
  test("a replayed pre-cancellation event does not restore access", async () => {
    const active = await getSubscription(scenario.subscriptionId);

    await stripe.subscriptions.cancel(scenario.subscriptionId);
    await deliverSubscriptionEvent(
      "customer.subscription.deleted",
      await getSubscription(scenario.subscriptionId),
    );
    expect(await isKeyEnabled(scenario.keyId)).toBe(false);

    // Redeliver the stale "active" payload, as Stripe can on retry or
    // out-of-order delivery.
    await deliverSubscriptionEvent("customer.subscription.updated", active);

    expect(await isKeyEnabled(scenario.keyId)).toBe(false);
  });

  // D2 again, from the other direction: cancelling one of two subscriptions
  // must not revoke a customer who is still paying on the other.
  test("keeps access when only one of two subscriptions is canceled", async () => {
    const second = await stripe.subscriptions.create({
      customer: scenario.stripeCustomerId,
      items: [{ price: await resolveTestPriceId() }],
      trial_period_days: 30,
    });

    await stripe.subscriptions.cancel(second.id);
    await deliverSubscriptionEvent(
      "customer.subscription.deleted",
      await stripe.subscriptions.retrieve(second.id),
    );

    expect(await isKeyEnabled(scenario.keyId)).toBe(true);
  });

  // A customer with genuinely no team (a manual Stripe customer, or a team
  // deleted while its customer lived on) must NOT 5xx: retrying can't fix it,
  // and sustained 5xx makes Stripe disable the endpoint entirely.
  test("accepts an event for a customer with no team rather than 5xx-ing", async () => {
    const orphan = await stripe.customers.create({
      metadata: { e2e: "true" },
    });

    try {
      const response = await deliverStripeEvent(
        "customer.subscription.updated",
        { id: "sub_orphan", customer: orphan.id, status: "canceled" },
      );

      expect(response.status).toBe(200);
    } finally {
      await stripe.customers.del(orphan.id).catch(() => {});
    }
  });

  // Checkout creates a first-time subscriber's customer with no customer
  // metadata, and teams.stripe_customer_id is only written when the browser
  // reaches /stripe/success — which these events race. The team_id stamped on
  // the subscription has to resolve (and repair) the link, or every new
  // subscriber's first events would fail.
  test("links the team from subscription metadata before the redirect lands", async () => {
    const unlinked = await stripe.customers.create({
      metadata: { e2e: "true" },
    });

    try {
      await supabase
        .from("teams")
        .update({ stripe_customer_id: null })
        .eq("id", scenario.teamId);

      const response = await deliverStripeEvent(
        "customer.subscription.updated",
        {
          id: "sub_pending_link",
          customer: unlinked.id,
          status: "active",
          metadata: { team_id: scenario.teamId },
        },
      );

      expect(response.status).toBe(200);

      const team = await supabase
        .from("teams")
        .select("stripe_customer_id")
        .eq("id", scenario.teamId)
        .single();

      expect(team.data?.stripe_customer_id).toBe(unlinked.id);
    } finally {
      await supabase
        .from("teams")
        .update({ stripe_customer_id: scenario.stripeCustomerId })
        .eq("id", scenario.teamId);
      await stripe.customers.del(unlinked.id).catch(() => {});
    }
  });
});

test.describe("dashboard reflects revoked access", () => {
  test("shows the key as disabled and gates key creation after churn", async ({
    page,
  }) => {
    const keysUrl = `/${scenario.teamId}/${scenario.projectId}/keys`;

    await page.goto(keysUrl);
    await expect(page.getByText("disabled")).toHaveCount(0);

    await stripe.subscriptions.cancel(scenario.subscriptionId);
    await deliverSubscriptionEvent(
      "customer.subscription.deleted",
      await getSubscription(scenario.subscriptionId),
    );

    await page.goto(keysUrl);
    await expect(page.getByText("disabled").first()).toBeVisible();
  });

  // The "Create API Key" button can't be used to test the gate: route.component.tsx
  // reads `loaderData.billing`, which route.loader.ts has never returned, so the
  // button is disabled for every team regardless of subscription state. That's a
  // pre-existing bug on main, unrelated to this change — so the real server-side
  // gate is exercised by posting to the action directly.
  test("refuses to mint a new key after churn", async ({ page }) => {
    const before = await countProjectKeys(scenario.projectId);

    await stripe.subscriptions.cancel(scenario.subscriptionId);
    await deliverSubscriptionEvent(
      "customer.subscription.deleted",
      await getSubscription(scenario.subscriptionId),
    );

    await page.request.post(`/${scenario.teamId}/${scenario.projectId}/keys`, {
      form: {},
    });

    expect(await countProjectKeys(scenario.projectId)).toBe(before);
  });
});

test.describe("grace period", () => {
  // A payment failure must start the clock rather than revoke on the spot —
  // trigger/reconcile-subscription-access.ts owns the actual revocation.
  test("marks the team instead of revoking when a payment fails", async () => {
    // Ending the trial only produces a payment failure if the customer has a
    // (failing) default payment method. Without one Stripe rejects the update
    // outright, so this has to be caught rather than asserted on.
    let ended = true;
    try {
      await stripe.subscriptions.update(scenario.subscriptionId, {
        trial_end: "now",
      });
    } catch {
      ended = false;
    }

    const subscription = ended
      ? await getSubscription(scenario.subscriptionId)
      : null;

    test.skip(
      !subscription ||
        (subscription.status !== "past_due" && subscription.status !== "unpaid"),
      "Needs a Stripe test customer with a failing default payment method; see e2e/README.md.",
    );

    await deliverSubscriptionEvent(
      "customer.subscription.updated",
      subscription!,
    );

    expect(await isKeyEnabled(scenario.keyId)).toBe(true);

    const team = await supabase
      .from("teams")
      .select("payment_failed_at")
      .eq("id", scenario.teamId)
      .single();

    expect(team.data?.payment_failed_at).toBeTruthy();
  });
});
