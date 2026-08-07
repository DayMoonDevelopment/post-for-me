import { useTranslation } from "react-i18next";

import type { ProjectType } from "~/lib/types/project";

import { InfoIcon } from "~/icons";
import { PROJECT_TYPE_MODES } from "~/lib/project-type-modes";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import {
  Choicebox,
  ChoiceboxItem,
  ChoiceboxItemContent,
  ChoiceboxItemDescription,
  ChoiceboxItemIcon,
  ChoiceboxItemIndicator,
  ChoiceboxItemTitle,
} from "~/ui/choicebox";

import {
  OnboardingSlideHeader,
  OnboardingSlideItem,
  OnboardingSlideScroll,
  useOnboardingFlow,
} from "../onboarding";

/**
 * "What kind of project?" — the credential model, as two cards in a 2-up grid.
 * Built by composing the shared `Choicebox` in its `vertical` (card) orientation
 * rather than bespoke markup: the selected border/accent and the corner check
 * are the component's built-in pressed state. Quickstart is the default; the
 * always-visible flexibility note carries the reassurance, so there's no extra
 * per-choice CTA. White-label key entry happens later, on the review hub.
 */
export function ProjectTypeSlide() {
  const { t } = useTranslation();
  const { projectType, selectProjectType } = useOnboardingFlow();

  return (
    <OnboardingSlideItem
      data-slot="onboarding-project-type-slide"
      className="ps-0"
    >
      <OnboardingSlideHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.project.typeHeading")}
        </h2>
      </OnboardingSlideHeader>
      <OnboardingSlideScroll>
        <Choicebox
          orientation="vertical"
          className="grid grid-cols-2 gap-3"
          value={[projectType]}
          onValueChange={(value) => {
            // Single-select can toggle back to empty; ignore that so the
            // project always has a type (quickstart is the default).
            const next = value[0];
            if (next) selectProjectType(next as ProjectType);
          }}
        >
          {PROJECT_TYPE_MODES.map((mode) => (
            <ChoiceboxItem key={mode.id} value={mode.id} data-brand={mode.id}>
              <ChoiceboxItemIcon>
                <mode.icon />
              </ChoiceboxItemIcon>
              <ChoiceboxItemContent>
                <ChoiceboxItemTitle>{t(mode.titleKey)}</ChoiceboxItemTitle>
                <ChoiceboxItemDescription>
                  {t(mode.descriptionKey)}
                </ChoiceboxItemDescription>
              </ChoiceboxItemContent>
              <ChoiceboxItemIndicator />
            </ChoiceboxItem>
          ))}
        </Choicebox>

        <Alert variant="info" className="mt-auto">
          <InfoIcon />
          <AlertTitle>{t("onboarding.project.flexibilityTitle")}</AlertTitle>
          <AlertDescription>
            {t("onboarding.project.flexibilityDescription")}
          </AlertDescription>
        </Alert>
      </OnboardingSlideScroll>
    </OnboardingSlideItem>
  );
}
