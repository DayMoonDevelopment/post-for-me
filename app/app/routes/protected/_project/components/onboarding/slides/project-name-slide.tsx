import * as React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "~/lib/utils";

import {
  OnboardingSlideItem,
  OnboardingSlideScroll,
  useIsActiveStep,
  useOnboardingFlow,
  useStepGate,
} from "../onboarding";

/**
 * "What should we call this project?" — a dedicated step whose whole job is the
 * name. The input is deliberately oversized and chrome-less (just a bottom rule
 * that lights up on focus), TypeForm-style, so the step reads as a designed
 * moment rather than a form field. Gates Next on a non-empty name.
 */
export function ProjectNameSlide() {
  const { t } = useTranslation();
  const { projectName, setProjectName } = useOnboardingFlow();
  const isActive = useIsActiveStep();
  const inputRef = React.useRef<HTMLInputElement>(null);
  useStepGate(projectName.trim().length > 0);

  // Focus the input when the user ARRIVES at this step — not on mount. All
  // slides are mounted at once, so an `autoFocus` here would steal focus on open
  // and scroll the carousel straight to this slide (see the focus guard in
  // `onboarding.tsx`). `preventScroll` is essential: without it the browser
  // scrolls the carousel's overflow viewport horizontally to reveal the input,
  // shifting the track so the neighbouring slide bleeds in.
  React.useEffect(() => {
    if (isActive) inputRef.current?.focus({ preventScroll: true });
  }, [isActive]);

  return (
    <OnboardingSlideItem
      data-slot="onboarding-project-name-slide"
      className="ps-0"
    >
      <OnboardingSlideScroll className="justify-center gap-6 pt-8">
        <div>
          <p className="text-base font-normal text-balance text-muted-foreground">
            {t("onboarding.project.nameSubheading")}
          </p>
          <h2 className="font-heading text-2xl font-normal text-balance text-foreground">
            {t("onboarding.project.nameHeading")}
          </h2>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder={t("onboarding.project.namePlaceholder")}
          aria-label={t("onboarding.project.nameHeading")}
          className={cn(
            "w-full border-0 border-b-2 border-border bg-transparent px-0 pb-2",
            "text-3xl font-semibold text-foreground caret-primary",
            "placeholder:font-normal placeholder:text-muted-foreground/50",
            "transition-colors outline-none focus:border-primary",
          )}
        />
      </OnboardingSlideScroll>
    </OnboardingSlideItem>
  );
}
