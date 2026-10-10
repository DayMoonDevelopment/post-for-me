import { usePostHog } from "posthog-js/react";
import * as React from "react";

import { ONBOARDING_VERSION, type OnboardingStep } from "~/lib/onboarding";

/**
 * Client-side analytics for the onboarding flow.
 *
 * Onboarding is the one place we deliberately track interaction detail on the
 * CLIENT rather than the server (telemetry skill, Rule 1's carve-out for
 * "UI interaction detail / exploratory journey data"): we want the hard,
 * per-step path through the slider — what people pick, when they double back,
 * where they bail. The durable conversion anchors stay server-side
 * (`onboarding_started` aside): `onboarding_completed` / `onboarding_skipped`
 * and the final person properties are written by the `/onboarding` action, so
 * even if every event below is dropped by an ad blocker the funnel endpoints
 * and final selections survive.
 *
 * Three events, all `lowercase_snake_case`, `object_verb` past tense, with the
 * variability in PROPERTIES (never in the event name) so the flow charts as a
 * single funnel broken down by `step`:
 *
 * - `onboarding_step_completed` — funnel backbone; fires on each forward
 *   advance off a step.
 * - `onboarding_option_selected` — the "clicking around" layer; fires on every
 *   choice toggle (incl. de-selecting a platform).
 * - `onboarding_dismissed` — client-side abandonment (modal closed without
 *   finishing); mirrors the server-side `onboarding_skipped`.
 */
const EVENT = {
  stepCompleted: "onboarding_step_completed",
  optionSelected: "onboarding_option_selected",
  dismissed: "onboarding_dismissed",
} as const;

export function useOnboardingAnalytics() {
  const posthog = usePostHog();

  return React.useMemo(() => {
    // Stamped on every event so insights can pivot/segment by flow version and
    // a version bump never silently mixes old and new cuts of the flow.
    const base = { onboarding_version: ONBOARDING_VERSION };

    return {
      /** A single choice was toggled within a step (the indecision signal). */
      trackOptionSelected(props: {
        /** false when a multi-select option (a platform) is toggled OFF. */
        selected: boolean;
        /** How many options are selected on this step after the toggle. */
        selection_count: number;
        step: OnboardingStep;
        value: string;
      }) {
        posthog?.capture(EVENT.optionSelected, { ...base, ...props });
      },

      /** The user advanced forward off a step — the funnel step event. */
      trackStepCompleted(props: {
        /** The committed choice(s) for this step; null for steps with none. */
        selection: string | string[] | null;
        selection_count: number;
        step: OnboardingStep;
        step_count: number;
        step_index: number;
      }) {
        posthog?.capture(EVENT.stepCompleted, { ...base, ...props });
      },

      /** The modal was closed without finishing. */
      trackDismissed(props: {
        last_step: OnboardingStep;
        last_step_index: number;
        step_count: number;
      }) {
        posthog?.capture(EVENT.dismissed, { ...base, ...props });
      },
    };
  }, [posthog]);
}
