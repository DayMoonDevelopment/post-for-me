import { requireTeamMember, requireUser } from "~/lib/.server/guards";

import type { Route } from "./+types/route";

/**
 * The access gate for every `callback/teams/:teamId/*` route.
 *
 * These sit outside the `_protected` layout's middleware, so each one used to
 * carry its own guard call — and the Checkout return didn't: it authenticated
 * the caller but never checked they belonged to `:teamId` before linking a
 * Stripe customer onto that team. The write itself is scoped by RLS (`teams`
 * `FOR UPDATE USING (is_team_member(id))`), so nothing leaked, but the guard is
 * what makes that a second line of defense rather than the only one.
 *
 * As a layout middleware it applies to the whole namespace, so a callback added
 * here later is gated by default instead of by remembering.
 */
export const middleware: Route.MiddlewareFunction[] = [
  async ({ context, params }) => {
    await requireUser(context);
    await requireTeamMember(context, params.teamId);
  },
];
