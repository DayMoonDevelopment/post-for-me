import type * as React from "react";

import type { SetupActionDialogProps } from "~/components/setup-action-dialog";
import type { SetupContext } from "~/components/setup-context";
import type { TranslationKey } from "~/lib/i18n/config";

import { ApiKeyContent, ApiKeyDialog } from "~/components/api-key";
import { BillingContent, BillingSetupButton } from "~/components/billing";
import {
  ConnectAccountContent,
  ConnectAccountDialog,
} from "~/components/connect-account";
import { FirstPostContent, FirstPostDialog } from "~/components/first-post";
import {
  ProjectConfigContent,
  ProjectSetupModal,
} from "~/components/project-config";
import {
  ApiKeysIcon,
  BillingIcon,
  PostsIcon,
  SettingsIcon,
  SocialAccountsIcon,
} from "~/icons";

/**
 * The single source of truth for the steps a freshly-created project takes to
 * become functionally useful. Each step is one modular action family (a
 * display-neutral `Content` for the guided tour + a self-contained `Dialog` for
 * the single-step path) plus the metadata the launchpad needs to order, gate,
 * and render it. Both surfaces — the persistent checklist and the guided-tour
 * carousel — are projections of THIS list, so they can never drift.
 */

/** The query param that opens the guided-tour modal on the launchpad. This is
 * what Stripe's `success_url` returns to (e.g. `/?setup=tour`) and what the
 * sidebar debug entry sets. */
export const SETUP_TOUR_PARAM = "setup";
export const SETUP_TOUR_VALUE = "tour";

/** Set by Stripe Checkout's success callback (`/?setup=tour&checkout=success`)
 * so the tour leads with a payment-confirmation slide. Absent when the tour is
 * opened from inside the app (sidebar debug, etc.), so that slide is skipped. */
export const SETUP_TOUR_CONFIRM_PARAM = "checkout";
export const SETUP_TOUR_CONFIRM_VALUE = "success";

export type SetupStepId =
  | "billing"
  | "configure-project"
  | "api-key"
  | "connect-account"
  | "first-post";

// The data shape lives in the neutral `setup-context` module (so action
// families can read it without depending on the launchpad). Re-exported here for
// the launchpad's consumers.
export type { SetupContext };

export type SetupStep = {
  /**
   * A custom row action, rendered in place of the default "Get started" button —
   * e.g. billing's {@link BillingButton} (a POST → Stripe redirect with a
   * spinner). When set, the checklist renders this instead of opening a dialog,
   * and `Dialog` is unused.
   */
  Action?: React.ComponentType;
  /** Display-neutral content — consumed by the guided-tour carousel. */
  Content: React.ComponentType;
  /** i18n key for the one-line description. */
  descriptionKey: TranslationKey;
  /** Self-contained modal — opened by the checklist's single-step path. Omitted
   * for steps with a custom {@link Action}. */
  Dialog?: React.ComponentType<SetupActionDialogProps>;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  id: SetupStepId;
  /** Does this step apply to the active project? (e.g. credentials only for
   * white-label.) */
  isApplicable: (ctx: SetupContext) => boolean;
  /** Is this step satisfied? */
  isComplete: (ctx: SetupContext) => boolean;
  /** Optional steps are always actionable and never gate a later step. */
  optional?: boolean;
  /** i18n key for the short row/slide title. */
  titleKey: TranslationKey;
};

/**
 * Logical order: billing first; then configure the project (an optional OAuth
 * callback URL for everyone, plus required developer credentials for
 * white-label); then the "see the value" sequence — create an API key, connect
 * an account, publish the first post.
 */
export const SETUP_STEPS: SetupStep[] = [
  {
    id: "billing",
    icon: BillingIcon,
    titleKey: "setup.billing.title",
    descriptionKey: "setup.billing.description",
    // Billing is state-aware: existing customer → Manage (portal); new customer
    // → opens the plan picker. A custom action, not a modal step.
    Action: BillingSetupButton,
    isApplicable: () => true,
    isComplete: (ctx) => ctx.billingComplete,
    Content: BillingContent,
  },
  {
    id: "configure-project",
    icon: SettingsIcon,
    titleKey: "setup.configureProject.title",
    descriptionKey: "setup.configureProject.description",
    isApplicable: () => true,
    // White-label must add developer credentials to be usable; quickstart has no
    // required configuration (the callback URL is optional), so it's done.
    isComplete: (ctx) =>
      ctx.projectType === "white-label" ? ctx.credentialsComplete : true,
    Content: ProjectConfigContent,
    Dialog: ProjectSetupModal,
  },
  {
    id: "api-key",
    icon: ApiKeysIcon,
    titleKey: "setup.apiKey.title",
    descriptionKey: "setup.apiKey.description",
    isApplicable: () => true,
    isComplete: (ctx) => ctx.apiKeyCreated,
    Content: ApiKeyContent,
    Dialog: ApiKeyDialog,
  },
  {
    id: "connect-account",
    icon: SocialAccountsIcon,
    titleKey: "setup.connectAccount.title",
    descriptionKey: "setup.connectAccount.description",
    isApplicable: () => true,
    isComplete: (ctx) => ctx.accountConnected,
    Content: ConnectAccountContent,
    Dialog: ConnectAccountDialog,
  },
  {
    id: "first-post",
    icon: PostsIcon,
    titleKey: "setup.firstPost.title",
    descriptionKey: "setup.firstPost.description",
    isApplicable: () => true,
    isComplete: (ctx) => ctx.firstPostPublished,
    Content: FirstPostContent,
    Dialog: FirstPostDialog,
  },
];

/** The steps that apply to this project, in order. */
export function applicableSteps(ctx: SetupContext): SetupStep[] {
  return SETUP_STEPS.filter((step) => step.isApplicable(ctx));
}

export type SetupStepStatus = "complete" | "current" | "upcoming";

/**
 * Sequential status for the checklist. The first incomplete REQUIRED step is
 * "current"; required steps after it are "upcoming" (gated until earlier
 * required steps are done). Optional steps are always actionable ("current")
 * and never gate the steps that follow.
 */
export function stepStatuses(
  ctx: SetupContext,
): Map<SetupStepId, SetupStepStatus> {
  const result = new Map<SetupStepId, SetupStepStatus>();
  let currentClaimed = false;
  for (const step of applicableSteps(ctx)) {
    if (step.isComplete(ctx)) {
      result.set(step.id, "complete");
    } else if (step.optional) {
      result.set(step.id, "current");
    } else if (!currentClaimed) {
      result.set(step.id, "current");
      currentClaimed = true;
    } else {
      result.set(step.id, "upcoming");
    }
  }
  return result;
}
