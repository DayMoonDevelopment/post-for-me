import { z } from "zod";

/**
 * Login validation, shared by the route action (server, source of truth) and
 * the form components (client, instant feedback) — one schema, validated on
 * both sides. Messages stay generic here; callers map failures to localized
 * copy (`login.errors.*`) so i18n lives in one place.
 */

/** Email step — the "request" intent. */
export const loginEmailSchema = z.object({
  email: z.string().trim().pipe(z.email()),
});
export type LoginEmailInput = z.infer<typeof loginEmailSchema>;

/** Verify step — the "verify" intent. The OTP is a 6-digit numeric code. */
export const loginCodeSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});
export type LoginCodeInput = z.infer<typeof loginCodeSchema>;
