import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/route";

const { constructEvent, trigger } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  trigger: vi.fn(),
}));

vi.mock("~/lib/.server/stripe", () => ({
  stripe: { webhooks: { constructEvent } },
}));
vi.mock("~/lib/.server/stripe.constants", () => ({
  STRIPE_WEBHOOK_SECRET: "whsec_test",
}));
vi.mock("@trigger.dev/sdk", () => ({ tasks: { trigger } }));

import { action } from "./route.action";

function invoke(signature: string | null = "test-signature", body = "raw payload") {
  return action({
    request: new Request("https://dashboard.test/api/stripe/webhook", {
      method: "POST",
      headers: signature === null ? {} : { "stripe-signature": signature },
      body,
    }),
    params: {},
    context: {},
  } as Route.ActionArgs);
}

function eventFor(type: Stripe.Event.Type, customer: unknown = "cus_1") {
  return {
    id: "evt_1",
    type,
    created: 1770000000,
    data: {
      object: type === "customer.created" || type === "customer.updated"
        ? { id: "cus_1", metadata: { team_id: "team_1" } }
        : { id: "object_1", customer },
      previous_attributes: { status: "past_due" },
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  constructEvent.mockReturnValue(eventFor("customer.subscription.updated"));
  trigger.mockResolvedValue({ id: "run_1" });
});

describe("Stripe webhook action", () => {
  it("rejects a missing signature without verifying or enqueueing", async () => {
    const response = await invoke(null);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid signature");
    expect(constructEvent).not.toHaveBeenCalled();
    expect(trigger).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature without enqueueing", async () => {
    constructEvent.mockImplementationOnce(() => {
      throw new Error("Invalid Stripe signature");
    });

    const response = await invoke();

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Webhook Error: Invalid Stripe signature");
    expect(trigger).not.toHaveBeenCalled();
  });

  it("verifies the unmodified raw body with the signature and webhook secret", async () => {
    const body = '{ "id": "evt_1", "data": { "object": {} } }\n';

    await invoke("stripe-signature-value", body);

    expect(constructEvent).toHaveBeenCalledTimes(1);
    expect(constructEvent).toHaveBeenCalledWith(
      body,
      "stripe-signature-value",
      "whsec_test",
    );
  });

  it.each<Stripe.Event.Type>([
    "customer.created",
    "customer.updated",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.created",
    "invoice.paid",
    "invoice.payment_succeeded",
  ])("enqueues %s with the full verified event and customer-scoped options", async (type) => {
    const event = eventFor(type);
    constructEvent.mockReturnValueOnce(event);

    const response = await invoke();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveBeenCalledWith(
      "process-stripe-webhook",
      { event },
      {
        concurrencyKey: "cus_1",
        idempotencyKey: "stripe-webhook:evt_1",
        idempotencyKeyTTL: "7d",
      },
    );
    expect(trigger.mock.calls[0][1].event).toBe(event);
  });

  it.each<Stripe.Event.Type>(["customer.subscription.updated", "invoice.paid"])(
    "uses an expanded customer's ID for %s",
    async (type) => {
      constructEvent.mockReturnValueOnce(eventFor(type, { id: "cus_expanded" }));

      await invoke();

      expect(trigger.mock.calls[0][2].concurrencyKey).toBe("cus_expanded");
    },
  );

  it("enqueues customerless invoices without a customer concurrency key", async () => {
    constructEvent.mockReturnValueOnce(eventFor("invoice.created", null));

    expect((await invoke()).status).toBe(200);
    expect(trigger.mock.calls[0][2].concurrencyKey).toBeUndefined();
  });

  it("does not acknowledge the webhook until enqueueing succeeds", async () => {
    let resolveEnqueue!: (value: { id: string }) => void;
    trigger.mockReturnValueOnce(new Promise((resolve) => {
      resolveEnqueue = resolve;
    }));
    const settled = vi.fn();
    const responsePromise = invoke().then((response) => {
      settled();
      return response;
    });

    await vi.waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));
    expect(settled).not.toHaveBeenCalled();

    resolveEnqueue({ id: "run_1" });
    expect((await responsePromise).status).toBe(200);
  });

  it.each(["rejection", "synchronous throw"])("returns 503 on enqueue %s", async (failure) => {
    const error = new Error("Trigger unavailable");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    if (failure === "rejection") {
      trigger.mockRejectedValueOnce(error);
    } else {
      trigger.mockImplementationOnce(() => { throw error; });
    }

    try {
      const response = await invoke();

      expect(response.status).toBe(503);
      expect(await response.text()).toBe("Failed to enqueue webhook");
      expect(log).toHaveBeenCalledWith("Failed to enqueue Stripe webhook evt_1:", error);
    } finally {
      log.mockRestore();
    }
  });

  it.each<Stripe.Event.Type>(["customer.deleted", "invoice.payment_failed", "checkout.session.completed"])(
    "acknowledges unsupported %s without enqueueing",
    async (type) => {
      constructEvent.mockReturnValueOnce(eventFor(type));

      const response = await invoke();

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      expect(constructEvent).toHaveBeenCalledTimes(1);
      expect(trigger).not.toHaveBeenCalled();
    },
  );

  it("uses a distinct idempotency key for each Stripe event", async () => {
    constructEvent.mockReturnValueOnce({ ...eventFor("invoice.paid"), id: "evt_2" });

    await invoke();

    expect(trigger.mock.calls[0][2].idempotencyKey).toBe("stripe-webhook:evt_2");
  });
});
