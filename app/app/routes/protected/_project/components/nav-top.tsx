import { SETUP_TOUR_PARAM, SETUP_TOUR_VALUE } from "~/components/launchpad";
import { type NavItem, NavSection } from "~/components/shell";
import { DebugIcon, RocketIcon } from "~/icons";

import { useOnboarding } from "./onboarding/onboarding-provider";

/**
 * The sidebar "top menu" — the first thing in the sidebar content, above the
 * project nav. Starts with a "Getting started" entry that re-opens onboarding;
 * built on `NavSection` so more top-level actions/links can be added here later.
 */
export function NavTop() {
  const { openOnboarding } = useOnboarding();

  const items: NavItem[] = [
    {
      titleKey: "sidebar.nav.gettingStarted",
      icon: RocketIcon,
      onSelect: openOnboarding,
    },
    // DEBUG: simulates the Stripe `success_url` round-trip by landing on the
    // launchpad with the tour param set, which opens the guided-tour modal.
    // Stands in until real Stripe checkout is wired.
    {
      titleKey: "sidebar.nav.debugSetupTour",
      icon: DebugIcon,
      url: `/?${SETUP_TOUR_PARAM}=${SETUP_TOUR_VALUE}`,
    },
  ];

  return <NavSection items={items} />;
}
