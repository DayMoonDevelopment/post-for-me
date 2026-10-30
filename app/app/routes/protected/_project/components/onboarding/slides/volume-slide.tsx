import { useTranslation } from "react-i18next";

import { ONBOARDING_VOLUMES, type OnboardingVolume } from "~/lib/onboarding";
import {
  Choicebox,
  ChoiceboxItem,
  ChoiceboxItemContent,
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

/** "How much do you plan to post?" — single-select volume buckets that inform
 * the recommended plan on the billing step. */
export function VolumeSlide() {
  const { t } = useTranslation();
  const { volume, selectVolume } = useOnboardingFlow();
  useStepGate(volume !== null);

  return (
    <OnboardingSlideItem data-slot="onboarding-volume-slide" className="ps-0">
      <OnboardingSlideHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.volume.heading")}
        </h2>
        <p className="text-sm/relaxed text-muted-foreground">
          {t("onboarding.volume.subheading")}
        </p>
      </OnboardingSlideHeader>
      <OnboardingSlideScroll>
        <Choicebox
          className="gap-2"
          value={volume ? [volume] : []}
          onValueChange={(value) => {
            const next = value[0];
            if (next) selectVolume(next as OnboardingVolume);
          }}
        >
          {ONBOARDING_VOLUMES.map((bucket) => (
            <ChoiceboxItem key={bucket} value={bucket} className="py-3">
              <ChoiceboxItemContent>
                <ChoiceboxItemTitle>
                  {t(`onboarding.volume.options.${bucket}.label`)}
                </ChoiceboxItemTitle>
              </ChoiceboxItemContent>
              <ChoiceboxItemIndicator />
            </ChoiceboxItem>
          ))}
        </Choicebox>
      </OnboardingSlideScroll>
    </OnboardingSlideItem>
  );
}
