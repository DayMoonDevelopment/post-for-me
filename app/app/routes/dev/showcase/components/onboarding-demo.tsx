import * as React from "react";

import {
  Onboarding,
  OnboardingContent,
  OnboardingFooter,
} from "~/routes/protected/_project/components/onboarding/onboarding";
import {
  BillingSlide,
  PlatformsSlide,
  ProjectNameSlide,
  ProjectTypeSlide,
  ReviewSlide,
  SegmentSlide,
  VolumeSlide,
  WelcomeSlide,
} from "~/routes/protected/_project/components/onboarding/slides";
import { Button } from "~/ui/button";

import { Section } from "./section";

export function OnboardingDemo() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-8">
      <Section title="Onboarding carousel">
        <Button onClick={() => setOpen(true)}>Open onboarding</Button>
        <Onboarding
          open={open}
          onOpenChange={setOpen}
          initialProjectName="My project"
          onComplete={() => setOpen(false)}
          onSkip={() => setOpen(false)}
        >
          <OnboardingContent>
            <WelcomeSlide />
            <SegmentSlide />
            <PlatformsSlide />
            <VolumeSlide />
            <ProjectNameSlide />
            <ProjectTypeSlide />
            {/* The review hub adapts to the project type picked on the type
                step: white-label gets per-platform key drill-downs + an
                incomplete warning, quickstart just confirms. Reflects the
                platforms selected earlier. */}
            <ReviewSlide />
            <BillingSlide />
          </OnboardingContent>
          <OnboardingFooter />
        </Onboarding>
      </Section>
    </div>
  );
}
