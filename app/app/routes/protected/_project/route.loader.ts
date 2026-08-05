import { isFeatureEnabledForUser } from "~/lib/.server/posthog";
import { currentUserContext } from "~/lib/.server/services";
import { loadShellData } from "~/lib/.server/shell";
import { SHOW_ONBOARDING_FLAG } from "~/lib/onboarding";

import type { Route } from "./+types/route";

export async function loader({ request, context }: Route.LoaderArgs) {
  // Identity is already resolved and guaranteed by the route middleware (the
  // single auth gate) — read it, don't re-check it.
  const sessionUser = context.get(currentUserContext);

  const [shell, showOnboarding] = await Promise.all([
    // The user, tenants, and sidebar state every shell's chrome needs — shared
    // with `_team` so the two can't drift.
    loadShellData(request, context),
    // Resolved server-side (not via posthog-js) so ad blockers can't suppress
    // the onboarding auto-open; handed to the client as loader data below.
    isFeatureEnabledForUser({
      userId: sessionUser.id,
      flag: SHOW_ONBOARDING_FLAG,
    }),
  ]);

  return {
    ...shell,
    // TEMPORARY — the welcome modal is force-hidden while billing is being
    // tested, so it doesn't open over every page load. Restore by returning
    // `showOnboarding` (the resolved flag) instead of `false`.
    showOnboarding: false,
  };
}
