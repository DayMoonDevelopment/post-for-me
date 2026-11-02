import { z } from "zod";

import { WEBHOOK_EVENT_TYPES } from "~/lib/types/webhook";

/**
 * Shared create/edit validation for a webhook — one schema validated on the
 * server (the route actions) and the client (the form dialog). `url` must be a
 * valid absolute http(s) URL; at least one event type is required (the set is
 * deduped downstream in the service). Kept in a pure `.ts` so the server action
 * can import it without pulling the dialog's React.
 */
export const webhookFormSchema = z.object({
  eventTypes: z
    .array(z.enum(WEBHOOK_EVENT_TYPES))
    .min(1)
    // Dedupe defensively — the UI shouldn't submit repeats, but a webhook's
    // subscriptions must be unique within it.
    .transform((types) => [...new Set(types)]),
  url: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .url()
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "Must be an http(s) URL",
    }),
});

export type WebhookFormInput = z.infer<typeof webhookFormSchema>;
