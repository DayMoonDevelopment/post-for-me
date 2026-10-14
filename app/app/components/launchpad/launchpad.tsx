import { useTranslation } from "react-i18next";

import { SetupContextProvider } from "~/components/setup-context";

import type { SetupContext } from "./setup-steps";

import { LaunchpadChecklist } from "./launchpad-checklist";
import { LaunchpadTour } from "./launchpad-tour";

/**
 * The launchpad surface: where a developer lands once their team + project
 * exist, guiding them through the steps that make the project functionally
 * useful. Renders the persistent checklist and mounts the URL-driven guided
 * tour (opened by a returning Stripe checkout or the sidebar debug entry).
 *
 * Data-connected via `context`, resolved by the launchpad route loader.
 */
export function Launchpad({ context }: { context: SetupContext }) {
  const { t } = useTranslation();
  return (
    <SetupContextProvider value={context}>
      <div className="flex w-full flex-col gap-8 py-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {t("launchpad.heading")}
          </h1>
          <p className="text-sm/relaxed text-muted-foreground">
            {t("launchpad.subheading")}
          </p>
        </div>
        <LaunchpadChecklist context={context} />
        <LaunchpadTour context={context} />
      </div>
    </SetupContextProvider>
  );
}
