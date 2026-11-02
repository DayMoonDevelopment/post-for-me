import { z } from "zod";

/**
 * Validation for the project-settings mutations — shared by the route action
 * (server source of truth) and the section form components (instant client
 * feedback), so they can't drift. One schema per intent.
 */

export const projectNameSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type ProjectNameInput = z.infer<typeof projectNameSchema>;

/** A valid http(s) URL, or empty (which clears the callback). */
function isCallbackUrl(value: string): boolean {
  if (value === "") return true;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const projectCallbackUrlSchema = z.object({
  callbackUrl: z
    .string()
    .trim()
    .max(2000)
    .refine(isCallbackUrl, { message: "invalid" }),
});
export type ProjectCallbackUrlInput = z.infer<typeof projectCallbackUrlSchema>;
