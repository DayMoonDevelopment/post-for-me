import { useTranslation } from "react-i18next";

import type { OnboardingSegment } from "~/lib/onboarding";

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
  useStepGate,
} from "../onboarding";
import { SEGMENTS } from "./segment-meta";

/** "What are you building?" — single-select. Gates Next on a choice. */
export function SegmentSlide() {
  const { t } = useTranslation();
  const { segment, selectSegment } = useOnboardingFlow();
  useStepGate(segment !== null);

  return (
    <OnboardingSlideItem data-slot="onboarding-segment-slide" className="ps-0">
      <OnboardingSlideHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.segments.heading")}
        </h2>
      </OnboardingSlideHeader>
      <OnboardingSlideScroll>
        <Choicebox
          value={segment ? [segment] : []}
          onValueChange={(value) => {
            const next = value[0];
            if (next) selectSegment(next as OnboardingSegment);
          }}
        >
          {SEGMENTS.map((option) => (
            <ChoiceboxItem key={option.id} value={option.id}>
              <ChoiceboxItemIcon>
                <option.icon />
              </ChoiceboxItemIcon>
              <ChoiceboxItemContent>
                <ChoiceboxItemTitle>{t(option.titleKey)}</ChoiceboxItemTitle>
                <ChoiceboxItemDescription>
                  {t(option.descriptionKey)}
                </ChoiceboxItemDescription>
              </ChoiceboxItemContent>
              <ChoiceboxItemIndicator />
            </ChoiceboxItem>
          ))}
        </Choicebox>
      </OnboardingSlideScroll>
    </OnboardingSlideItem>
  );
}
