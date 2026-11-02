import * as React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import {
  Modal,
  ModalCarousel,
  ModalCarouselDots,
  ModalCarouselNav,
  ModalCarouselViewport,
  ModalContent,
  ModalFooter,
  ModalSlide,
  ModalTitle,
} from "~/components/modal";
import {
  SetupScreen,
  SetupScreenBody,
  SetupScreenHeader,
} from "~/components/setup-screen";
import { SuccessSolidIcon } from "~/icons";

import {
  applicableSteps,
  SETUP_TOUR_CONFIRM_PARAM,
  SETUP_TOUR_CONFIRM_VALUE,
  SETUP_TOUR_PARAM,
  SETUP_TOUR_VALUE,
  type SetupContext,
  type SetupStep,
} from "./setup-steps";

/**
 * The guided-tour expression of the setup steps: a click-through carousel that
 * walks every applicable step in order, one focused screen at a time. It's the
 * narrowed-focus counterpart to {@link LaunchpadChecklist}, and consumes each
 * step's display-neutral `Content` directly — so the SAME screen that appears in
 * a step's standalone dialog also appears here, just framed as a slide.
 *
 * Opening is URL-driven: this is the modal a returning Stripe `success_url`
 * (`/?setup=tour`) lands in, and what the sidebar debug entry triggers. Closing
 * clears the param so the URL doesn't re-open it on refresh.
 */
export function LaunchpadTour({ context }: { context: SetupContext }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get(SETUP_TOUR_PARAM) === SETUP_TOUR_VALUE;
  // Only when arriving from Stripe Checkout's success callback do we lead with a
  // payment-confirmation slide; opening the tour from inside the app skips it.
  const confirmed =
    searchParams.get(SETUP_TOUR_CONFIRM_PARAM) === SETUP_TOUR_CONFIRM_VALUE;
  const steps = applicableSteps(context);

  const close = React.useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(SETUP_TOUR_PARAM);
        next.delete(SETUP_TOUR_CONFIRM_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return (
    <Modal open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <ModalContent
        layout="framed"
        data-slot="launchpad-tour"
        className="max-w-xl"
      >
        <ModalTitle className="sr-only">{t("launchpad.tour.title")}</ModalTitle>
        {/* Remount the carousel each open so it always starts on the first step
            and embla re-measures. */}
        {open ? (
          <TourCarousel
            steps={steps}
            showConfirmation={confirmed}
            onFinish={close}
          />
        ) : null}
      </ModalContent>
    </Modal>
  );
}

function TourCarousel({
  steps,
  showConfirmation,
  onFinish,
}: {
  onFinish: () => void;
  showConfirmation: boolean;
  steps: SetupStep[];
}) {
  const { t } = useTranslation();
  return (
    <ModalCarousel>
      <ModalCarouselViewport>
        {showConfirmation ? (
          <ModalSlide key="__confirm">
            <div className="flex h-[clamp(24rem,68vh,32rem)] flex-col px-6 pt-6">
              <TourConfirmation />
            </div>
          </ModalSlide>
        ) : null}
        {steps.map((step) => {
          const Content = step.Content;
          return (
            <ModalSlide key={step.id}>
              <div className="flex h-[clamp(24rem,68vh,32rem)] flex-col px-6 pt-6">
                <Content />
              </div>
            </ModalSlide>
          );
        })}
      </ModalCarouselViewport>
      <ModalFooter className="sm:justify-between">
        <ModalCarouselDots />
        <ModalCarouselNav
          backLabel={t("common.back")}
          nextLabel={t("common.next")}
          finishLabel={t("launchpad.tour.finish")}
          onFinish={onFinish}
        />
      </ModalFooter>
    </ModalCarousel>
  );
}

/**
 * The lead slide shown only when the tour opens from Stripe Checkout's success
 * callback — confirms the payment landed and frames the rest of the tour as
 * "let's get started". Reuses the same {@link SetupScreen} chrome as the step
 * slides so it sits flush in the carousel.
 */
function TourConfirmation() {
  const { t } = useTranslation();
  return (
    <SetupScreen data-slot="tour-confirmation">
      <SetupScreenHeader
        icon={<SuccessSolidIcon />}
        title={t("launchpad.tour.confirm.title")}
        description={t("launchpad.tour.confirm.subtitle")}
      />
      <SetupScreenBody className="items-start">
        <p className="text-sm/relaxed text-muted-foreground">
          {t("launchpad.tour.confirm.body")}
        </p>
      </SetupScreenBody>
    </SetupScreen>
  );
}
