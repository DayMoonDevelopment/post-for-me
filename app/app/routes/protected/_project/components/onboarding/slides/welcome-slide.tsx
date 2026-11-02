import type { ComponentType } from "react";

import { useTranslation } from "react-i18next";

import type { TranslationKey } from "~/lib/i18n/config";

import { AiAgentIcon, DeveloperIcon, MarketingIcon } from "~/icons";

import { OnboardingSlideItem, OnboardingSlideScroll } from "../onboarding";
import { OrbitingPlatforms } from "../orbiting-platforms";

/** The product's three value props, Apple-welcome-screen style. */
const features: {
  bodyKey: TranslationKey;
  icon: ComponentType<{ className?: string }>;
  titleKey: TranslationKey;
}[] = [
  {
    icon: DeveloperIcon,
    titleKey: "onboarding.welcome.features.saas.title",
    bodyKey: "onboarding.welcome.features.saas.body",
  },
  {
    icon: AiAgentIcon,
    titleKey: "onboarding.welcome.features.agent.title",
    bodyKey: "onboarding.welcome.features.agent.body",
  },
  {
    icon: MarketingIcon,
    titleKey: "onboarding.welcome.features.marketing.title",
    bodyKey: "onboarding.welcome.features.marketing.body",
  },
];

/** The opening slide: the brand hero, a welcome headline, and the value prop —
 * the easiest way to post, framed for each of our audiences. */
export function WelcomeSlide() {
  const { t } = useTranslation();
  return (
    <OnboardingSlideItem data-slot="onboarding-welcome-slide" className="ps-0">
      <OnboardingSlideScroll className="pt-8">
        {/* Hero graphic grows to fill whatever vertical space is left after the
            copy below has been laid out. */}
        <OrbitingPlatforms className="flex-1" />
        {/* The modal is wide relative to the copy, so cap + center the lower
            content. */}
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1 text-center">
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              {t("onboarding.welcome.title")}
            </h2>
            <p className="text-sm/relaxed text-muted-foreground">
              {t("onboarding.welcome.subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {features.map((feature) => (
              <div key={feature.titleKey} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-pop/10 text-pop [&_svg]:size-5">
                  <feature.icon />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {t(feature.titleKey)}
                  </span>
                  <span className="text-xs/relaxed text-muted-foreground">
                    {t(feature.bodyKey)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </OnboardingSlideScroll>
    </OnboardingSlideItem>
  );
}
