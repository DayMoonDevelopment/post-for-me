import * as React from "react";
import { useTranslation } from "react-i18next";

import type { OnboardingPlatform } from "~/lib/onboarding";

import { ModalView, ModalViews, useModalViews } from "~/components/modal";
import {
  ProjectKeyFields,
  ProjectPlatformPicker,
  ProjectReviewHub,
} from "~/components/project-config/project-review";
import { credentialHasKeys } from "~/lib/brand-readiness";
import { PLATFORMS } from "~/lib/platform-meta";

import {
  OnboardingSlideHeader,
  OnboardingSlideItem,
  OnboardingSlideScroll,
  useIsActiveStep,
  useOnboardingFlow,
} from "../onboarding";

/** The view-stack key for a platform's key-entry sub-view. */
function keysView(platform: OnboardingPlatform) {
  return `keys:${platform}`;
}

/**
 * The always-present step after project setup: the shared "Review your project"
 * screen ({@link ProjectReviewHub}), wired to the onboarding flow. Editing
 * platforms and entering keys are in-modal sub-views via {@link ModalViews}: the
 * footer Back pops the stack, and the hub's primary action creates the project.
 */
export function ReviewSlide() {
  const { projectType, platforms, setPlatforms, credentials, setCredential } =
    useOnboardingFlow();

  const isWhiteLabel = projectType === "white-label";
  const enabled = PLATFORMS.filter((platform) =>
    platforms.includes(platform.id),
  );

  return (
    <OnboardingSlideItem data-slot="onboarding-review-slide" className="ps-0">
      <ModalViews defaultView="hub">
        <ReviewController />
        <ModalView value="hub">
          <ReviewHub />
        </ModalView>
        <ModalView value="platforms">
          <PlatformEditor platforms={platforms} setPlatforms={setPlatforms} />
        </ModalView>
        {isWhiteLabel
          ? enabled.map((platform) => (
              <ModalView key={platform.id} value={keysView(platform.id)}>
                <KeyForm
                  platform={platform.id}
                  appId={credentials[platform.id]?.appId ?? ""}
                  appSecret={credentials[platform.id]?.appSecret ?? ""}
                  setCredential={setCredential}
                />
              </ModalView>
            ))
          : null}
      </ModalViews>
    </OnboardingSlideItem>
  );
}

/**
 * Bridges the {@link ModalViews} stack into the onboarding footer: the hub view
 * surfaces "Create your project" (with a simulated loading state); any sub-view
 * surfaces Back (pop) + "Done" (pop). Also resets the stack to the hub when the
 * slide isn't active, so re-entry starts at the root. Renders nothing.
 */
function ReviewController() {
  const { t } = useTranslation();
  const { active, pop, reset } = useModalViews();
  const isActive = useIsActiveStep();
  const { setSlideBack, setSlideAction, next, complete } = useOnboardingFlow();
  const [creating, setCreating] = React.useState(false);

  const nextRef = React.useRef(next);
  nextRef.current = next;
  const completeRef = React.useRef(complete);
  completeRef.current = complete;
  const createTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCreate = React.useCallback(() => {
    if (createTimer.current) return;
    setCreating(true);
    createTimer.current = setTimeout(() => {
      createTimer.current = null;
      setCreating(false);
      completeRef.current();
      nextRef.current();
    }, 1400);
  }, []);

  React.useEffect(
    () => () => {
      if (createTimer.current) clearTimeout(createTimer.current);
    },
    [],
  );

  React.useEffect(() => {
    if (!isActive) reset("hub");
  }, [isActive, reset]);

  const createLabel = t("onboarding.review.create");
  const creatingLabel = t("onboarding.review.creating");
  const doneLabel = t("common.done");

  React.useEffect(() => {
    if (!isActive) {
      setSlideBack(null);
      setSlideAction(null);
      return;
    }
    if (active === "hub") {
      setSlideBack(null);
      setSlideAction({
        label: creating ? creatingLabel : createLabel,
        onClick: handleCreate,
        pending: creating,
      });
      return;
    }
    setSlideBack(pop);
    setSlideAction({ label: doneLabel, onClick: pop });
    return () => {
      setSlideBack(null);
      setSlideAction(null);
    };
  }, [
    isActive,
    active,
    creating,
    handleCreate,
    createLabel,
    creatingLabel,
    doneLabel,
    pop,
    setSlideBack,
    setSlideAction,
  ]);

  return null;
}

/** The hub view — the shared review, wired to the flow + view-stack navigation. */
function ReviewHub() {
  const { t } = useTranslation();
  const { push } = useModalViews();
  const { projectName, projectType, platforms, credentials } =
    useOnboardingFlow();
  const enabled = PLATFORMS.filter((platform) =>
    platforms.includes(platform.id),
  );
  const keyed = new Set(
    enabled
      .filter((platform) => credentialHasKeys(credentials[platform.id]))
      .map((platform) => platform.id),
  );

  return (
    <>
      <OnboardingSlideHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.review.heading")}
        </h2>
      </OnboardingSlideHeader>
      <OnboardingSlideScroll className="gap-4">
        <ProjectReviewHub
          name={projectName}
          type={projectType}
          enabled={enabled}
          keyed={keyed}
          onEditPlatforms={() => push("platforms")}
          onAddKeys={(platform) => push(keysView(platform))}
        />
      </OnboardingSlideScroll>
    </>
  );
}

function PlatformEditor({
  platforms,
  setPlatforms,
}: {
  platforms: OnboardingPlatform[];
  setPlatforms: (platforms: OnboardingPlatform[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <OnboardingSlideHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.review.editPlatformsHeading")}
        </h2>
        <p className="text-sm/relaxed text-muted-foreground">
          {t("onboarding.platforms.subheading")}
        </p>
      </OnboardingSlideHeader>
      <OnboardingSlideScroll>
        <ProjectPlatformPicker value={platforms} onValueChange={setPlatforms} />
      </OnboardingSlideScroll>
    </>
  );
}

function KeyForm({
  platform,
  appId,
  appSecret,
  setCredential,
}: {
  appId: string;
  appSecret: string;
  platform: OnboardingPlatform;
  setCredential: ReturnType<typeof useOnboardingFlow>["setCredential"];
}) {
  const { t } = useTranslation();
  const meta = PLATFORMS.find((p) => p.id === platform);
  return (
    <>
      <OnboardingSlideHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
            {meta ? <meta.icon /> : null}
          </span>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {t("onboarding.review.keysHeading", { platform: meta?.label ?? "" })}
          </h2>
        </div>
        <p className="text-sm/relaxed text-muted-foreground">
          {t("onboarding.keys.subheading")}
        </p>
      </OnboardingSlideHeader>
      <OnboardingSlideScroll>
        <ProjectKeyFields
          platform={platform}
          appId={appId}
          appSecret={appSecret}
          onChange={(field, value) => setCredential(platform, field, value)}
        />
      </OnboardingSlideScroll>
    </>
  );
}
