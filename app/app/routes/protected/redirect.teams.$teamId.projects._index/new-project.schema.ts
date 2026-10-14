import { z } from "zod";

import { PROJECT_TYPES } from "~/lib/types/project";

/** What the new-project dialog submits. Mirrors `projectNameSchema` in the
 * settings schema (same name constraints) plus the type choice, which is only
 * ever set at creation. */
export const newProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(PROJECT_TYPES),
});
