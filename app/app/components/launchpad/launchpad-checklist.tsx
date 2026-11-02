import * as React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import { Step, StepContent, Steps } from "~/ui/steps";

import {
  applicableSteps,
  type SetupContext,
  type SetupStep,
  type SetupStepId,
  type SetupStepStatus,
  stepStatuses,
} from "./setup-steps";

/**
 * The persistent, vertically-oriented setup guide on the dashboard launchpad —
 * the always-available counterpart to the guided-tour modal. Both are
 * projections of `SETUP_STEPS`; this one lets a developer dip into ONE step at a
 * time: each row's primary button opens that step's self-contained modal (the
 * quick-gratification path), rather than committing to the full carousel tour.
 *
 * The vertical rail (status indicators + connecting line + upcoming dimming) is
 * the shared {@link Steps} primitive; this component supplies the per-step row
 * body and wires each row to its status and modal.
 *
 * Data-connected via `context` (resolved by the launchpad loader): it filters to
 * the applicable steps for the active project and derives each row's status.
 */
export function LaunchpadChecklist({
  context,
  className,
}: {
  className?: string;
  context: SetupContext;
}) {
  const steps = applicableSteps(context);
  const statuses = stepStatuses(context);
  // Which step's single-step modal is open (controlled so a row can open it).
  const [openStep, setOpenStep] = React.useState<SetupStepId | null>(null);

  return (
    <>
      <Steps data-slot="launchpad-checklist" className={className}>
        {steps.map((step) => {
          const status = statuses.get(step.id) ?? "upcoming";
          return (
            <Step
              key={step.id}
              status={status}
              disabled={status === "upcoming"}
            >
              <StepContent>
                <ChecklistRow
                  step={step}
                  status={status}
                  onStart={() => setOpenStep(step.id)}
                />
              </StepContent>
            </Step>
          );
        })}
      </Steps>

      {/* Modal steps mount their self-contained dialog (opened in controlled
          mode from the row). Steps with a custom Action (e.g. billing) render
          that inline instead and have no dialog. */}
      {steps.map((step) => {
        const StepDialog = step.Dialog;
        if (!StepDialog || step.Action) return null;
        return (
          <StepDialog
            key={step.id}
            open={openStep === step.id}
            onOpenChange={(next) => setOpenStep(next ? step.id : null)}
          />
        );
      })}
    </>
  );
}

function ChecklistRow({
  step,
  status,
  onStart,
}: {
  onStart: () => void;
  status: SetupStepStatus;
  step: SetupStep;
}) {
  const { t } = useTranslation();
  const StepIcon = step.icon;
  const isComplete = status === "complete";
  const isUpcoming = status === "upcoming";

  return (
    <div
      data-slot="launchpad-checklist-row"
      className={cn("flex items-center gap-3", isUpcoming && "opacity-60")}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4">
        <StepIcon />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-semibold text-foreground">
            {t(step.titleKey)}
          </span>
          {step.optional ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
              {t("launchpad.checklist.optional")}
            </span>
          ) : null}
        </div>
        <span className="text-xs/relaxed text-muted-foreground">
          {t(step.descriptionKey)}
        </span>
      </div>
      {step.Action ? (
        // Custom action (e.g. billing's POST→Stripe button). It owns its own
        // pending/loading state; the row just gates it when unreachable.
        <div
          className={isUpcoming ? "pointer-events-none opacity-50" : undefined}
        >
          <step.Action />
        </div>
      ) : (
        <Button
          variant={isComplete ? "secondary" : "default"}
          size="sm"
          // Gate required steps that aren't reachable yet; optional + complete
          // rows stay actionable (e.g. to revisit).
          disabled={isUpcoming}
          onClick={onStart}
        >
          {isComplete
            ? t("launchpad.checklist.review")
            : t("launchpad.checklist.getStarted")}
        </Button>
      )}
    </div>
  );
}
