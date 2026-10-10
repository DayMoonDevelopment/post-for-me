import { useTranslation } from "react-i18next";

import type { OnboardingPlatform } from "~/lib/onboarding";

import { PLATFORMS } from "~/lib/platform-meta";
import {
  Choicebox,
  ChoiceboxItem,
  ChoiceboxItemContent,
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

/** "Where do you want to post?" — a multi-select grid of platform cards. */
export function PlatformsSlide() {
  const { t } = useTranslation();
  const { platforms, setPlatforms } = useOnboardingFlow();
  useStepGate(platforms.length > 0);

  return (
    <OnboardingSlideItem data-slot="onboarding-platforms-slide" className="ps-0">
      <OnboardingSlideHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.platforms.heading")}
        </h2>
        <p className="text-sm/relaxed text-muted-foreground">
          {t("onboarding.platforms.subheading")}
        </p>
      </OnboardingSlideHeader>
      <OnboardingSlideScroll>
        <Choicebox
          multiple
          className="grid grid-cols-2 gap-3"
          value={platforms}
          onValueChange={(value) => setPlatforms(value as OnboardingPlatform[])}
        >
          {PLATFORMS.map((platform) => (
            <ChoiceboxItem key={platform.id} value={platform.id}>
              <ChoiceboxItemIcon>
                <platform.icon />
              </ChoiceboxItemIcon>
              <ChoiceboxItemContent>
                <ChoiceboxItemTitle>{platform.label}</ChoiceboxItemTitle>
              </ChoiceboxItemContent>
              <ChoiceboxItemIndicator />
            </ChoiceboxItem>
          ))}
        </Choicebox>
      </OnboardingSlideScroll>
    </OnboardingSlideItem>
  );
}
