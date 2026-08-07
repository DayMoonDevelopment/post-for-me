import * as React from "react";
import { useTranslation } from "react-i18next";

import type {
  OnboardingPlatform,
  OnboardingSegment,
  OnboardingVolume,
} from "~/lib/onboarding";
import type { ProjectType } from "~/lib/types/project";

import {
  Modal,
  ModalCarousel,
  ModalCarouselViewport,
  ModalContent,
  ModalSlide,
  ModalTitle,
  useModalCarousel,
} from "~/components/modal";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import { Spinner } from "~/ui/spinner";

/** A single provider's in-progress developer-key entry on the `keys` step. */
export type CredentialDraft = { appId: string; appSecret: string };
/** The keys collected so far, keyed by provider id. Partial: a provider only
 * appears once the user has typed into one of its fields. */
export type CredentialDrafts = Partial<
  Record<OnboardingPlatform, CredentialDraft>
>;

/**
 * Onboarding modal, built as a compound component family (see the
 * `compound-components` skill; `app/ui/sidebar.tsx` is the canonical pattern).
 * This file holds the generic, reusable PARTS; the concrete slides are
 * standalone components, one per file, under `./slides`. The consumer assembles
 * the flow:
 *
 *   <Onboarding open onOpenChange ...>
 *     <OnboardingContent>
 *       <SegmentSlide />
 *       <ConnectSlide />
 *     </OnboardingContent>
 *     <OnboardingFooter />
 *   </Onboarding>
 *
 * Shared carousel state + actions ride context, read by `useOnboardingFlow()`.
 */

/**
 * A single slide — a FIXED-height box (so the modal never resizes between steps)
 * laid out as a column that does NOT scroll itself. Compose its regions:
 *
 *   <OnboardingSlideItem>
 *     <OnboardingSlideHeader> title / description / back </OnboardingSlideHeader>
 *     <OnboardingSlideScroll> the long / optional body </OnboardingSlideScroll>
 *   </OnboardingSlideItem>
 *
 * `OnboardingSlideHeader` stays pinned (`shrink-0`); `OnboardingSlideScroll`
 * takes the remaining height and scrolls its overflow. A slide places the scroll
 * region around just the part that should scroll — e.g. the review hub keeps its
 * summary static and scrolls only the white-label key rows — as long as the
 * chain of ancestors down to that region stays `flex flex-col min-h-0`. Width
 * stays `basis-full` (from `CarouselItem`) so slides can't bleed into one
 * another.
 */
export function OnboardingSlideItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ModalSlide>) {
  return (
    <ModalSlide className={cn("ps-0", className)} {...props}>
      <div className="flex h-[clamp(26rem,70vh,34rem)] flex-col overflow-hidden">
        {children}
      </div>
    </ModalSlide>
  );
}

/** A slide's pinned, non-scrolling region — title, description, a back control.
 * Defaults to the standard header padding; override via `className`. */
export function OnboardingSlideHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="onboarding-slide-header"
      className={cn("flex shrink-0 flex-col gap-1.5 px-8 pt-8 pb-4", className)}
      {...props}
    />
  );
}

/**
 * A slide's scrolling region — takes the remaining height and scrolls its
 * overflow. The scroll element itself is full-bleed (no padding), so its
 * scrollbar rides the modal's edge instead of cutting across the content; the
 * padding lives on the inner wrapper, INSIDE the scroll, so content spills
 * full-bleed and the bottom padding only appears once you've scrolled to the
 * end (rather than permanently eating height). `className` styles that inner
 * wrapper (gaps, alignment, extra padding). `min-h-full` lets the inner content
 * fill the region when short — so `justify-center` / `mt-auto` still work.
 */
export function OnboardingSlideScroll({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="onboarding-slide-scroll"
      className="min-h-0 flex-1 overflow-y-auto"
      {...props}
    >
      <div className={cn("flex min-h-full flex-col gap-6 px-8 pb-8", className)}>
        {children}
      </div>
    </div>
  );
}

type OnboardingFlowContext = {
  back: () => void;
  /** The team billing applies to (the configured project's team), so the
   * hand-off slide's `BillingButton` can post to its checkout redirect. Null if
   * unknown. */
  billingTeamId: string | null;
  /** Whether the active slide's requirement is met — gates the "Next" button. */
  canAdvance: boolean;
  /** Finish (reached the end and confirmed). Fires once. */
  complete: () => void;
  /** White-label developer keys typed so far, keyed by provider. */
  credentials: CredentialDrafts;
  /**
   * Whether the footer (progress dots + nav) is suppressed. The terminal
   * handoff slide hides it so the only way forward is its own in-body CTA —
   * onboarding is already "complete" by then; what's left is the jump to
   * billing.
   */
  footerHidden: boolean;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  /** Platforms the user expects to post to (multi-select). */
  platforms: OnboardingPlatform[];
  /** The project name being configured (prefilled from the default project). */
  projectName: string;
  /** The credential model for the project (quickstart vs white-label). */
  projectType: ProjectType;
  /** The chosen "what are you building" segment, or null. */
  segment: OnboardingSegment | null;
  /** Index of the active slide. */
  selectedIndex: number;
  selectProjectType: (type: ProjectType) => void;
  selectSegment: (segment: OnboardingSegment) => void;
  selectVolume: (volume: OnboardingVolume) => void;
  setCredential: (
    provider: OnboardingPlatform,
    field: keyof CredentialDraft,
    value: string,
  ) => void;
  setFooterHidden: (hidden: boolean) => void;
  setPlatforms: (platforms: OnboardingPlatform[]) => void;
  setProjectName: (name: string) => void;
  setSlideAction: (
    action: { label: string; onClick: () => void; pending?: boolean } | null,
  ) => void;
  setSlideBack: (handler: (() => void) | null) => void;
  /** Slides report their own validity by index (via `useStepGate`). */
  setStepValidity: (index: number, valid: boolean) => void;
  /** Leave without finishing. Fires once. */
  skip: () => void;
  /**
   * A primary footer action a slide can surface in place of Next/Finish — e.g.
   * the review's edit-platforms sub-view shows a "Done" button, and the review
   * hub shows a "Create your project" button. Null where Next/Finish apply
   * normally. `pending` shows a spinner and disables the action (and Back) while
   * the slide is busy — e.g. the simulated project creation.
   */
  slideAction: { label: string; onClick: () => void; pending?: boolean } | null;
  /**
   * A slide can override the footer's Back button to pop its OWN internal view
   * instead of moving the carousel — used by the review hub's master-detail
   * drill-down. While an override is set, the footer hides its forward
   * (Next/Finish) button, so the only way out of the sub-view is back to the
   * slide's root, where the override is cleared.
   */
  slideBack: (() => void) | null;
  /** Total number of slides (derived from the carousel). */
  total: number;
  /** Expected monthly posting volume bucket, or null. */
  volume: OnboardingVolume | null;
};

const OnboardingContext = React.createContext<OnboardingFlowContext | null>(
  null,
);

export function useOnboardingFlow() {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error("Onboarding parts must be used within <Onboarding>");
  }
  return context;
}

// Each slide's position in the flow, injected by OnboardingContent so a slide
// can report its own validity for the active-step gate.
const StepIndexContext = React.createContext<number | null>(null);

function useStepIndex() {
  const index = React.useContext(StepIndexContext);
  if (index === null) {
    throw new Error("useStepGate must be used within an onboarding slide");
  }
  return index;
}

/**
 * Gate the footer's "Next" button from inside a slide: pass whether this
 * slide's requirement is satisfied. Next is disabled while the active slide is
 * unsatisfied. Slides with no requirement simply don't call this.
 */
export function useStepGate(satisfied: boolean) {
  const index = useStepIndex();
  const { setStepValidity } = useOnboardingFlow();
  React.useEffect(() => {
    setStepValidity(index, satisfied);
  }, [index, satisfied, setStepValidity]);
}

/**
 * Whether this slide is the one currently on screen. Slides with internal
 * sub-views (e.g. the review hub) use this to reset themselves when the user
 * navigates away, so they re-enter at their root state.
 */
export function useIsActiveStep() {
  const index = useStepIndex();
  const { selectedIndex } = useOnboardingFlow();
  return index === selectedIndex;
}

export type OnboardingProps = {
  /** The team billing applies to (the configured project's team). Surfaced on
   * the flow context for the hand-off slide's `BillingButton`. */
  billingTeamId?: string | null;
  children: React.ReactNode;
  className?: string;
  /** Initial project name to prefill (the default project's current name). */
  initialProjectName?: string;
  /** Initial credential model (the default project's current type). */
  initialProjectType?: ProjectType;
  /** Fired when the user finishes setup and the project is created — onboarding
   * is recorded complete (does NOT close the modal; the hand-off slide shows
   * next). */
  onComplete?: () => void;
  /** Fired whenever a developer-key field changes. */
  onCredentialsChange?: (credentials: CredentialDrafts) => void;
  onOpenChange: (open: boolean) => void;
  /** Fired whenever the selected platforms change. */
  onPlatformsChange?: (platforms: OnboardingPlatform[]) => void;
  /** Fired whenever the project name input changes. */
  onProjectNameChange?: (name: string) => void;
  /** Fired when the credential model (quickstart/white-label) is chosen. */
  onProjectTypeSelect?: (type: ProjectType) => void;
  /** Fired as soon as a segment tile is chosen (before the user finishes). */
  onSegmentSelect?: (segment: OnboardingSegment) => void;
  /**
   * Fired when the user closes without finishing (the ✕ / esc / backdrop is the
   * implied "skip"). `step` is the 0-based slide they were on.
   */
  onSkip?: (detail: { step: number; stepCount: number }) => void;
  /**
   * Fired on a deliberate forward advance off a slide (the analytics funnel's
   * step event). Carries the 0-based index of the slide being left and the
   * total slide count.
   */
  onStepComplete?: (detail: { stepCount: number; stepIndex: number; }) => void;
  /** Fired when an expected-volume bucket is chosen. */
  onVolumeSelect?: (volume: OnboardingVolume) => void;
  open: boolean;
};

export function Onboarding({
  open,
  onOpenChange,
  onSegmentSelect,
  onPlatformsChange,
  onVolumeSelect,
  initialProjectName = "",
  initialProjectType = "quickstart",
  onProjectNameChange,
  onProjectTypeSelect,
  onCredentialsChange,
  onComplete,
  billingTeamId = null,
  onStepComplete,
  onSkip,
  className,
  children,
}: OnboardingProps) {
  const { t } = useTranslation();
  // The carousel state is owned by <ModalCarousel> (rendered below); an inner
  // <OnboardingCarouselSync> mirrors its index/total up to this state and stashes
  // its scroll controls in this ref, so the flow context (and the close handler,
  // which needs the active index) stay the single source of truth.
  const carouselRef = React.useRef<{
    scrollNext: () => void;
    scrollPrev: () => void;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [segment, setSegment] = React.useState<OnboardingSegment | null>(null);
  const [platforms, setPlatformsState] = React.useState<OnboardingPlatform[]>(
    []
  );
  const [volume, setVolume] = React.useState<OnboardingVolume | null>(null);
  const [projectName, setProjectNameState] =
    React.useState(initialProjectName);
  const [projectType, setProjectTypeState] =
    React.useState<ProjectType>(initialProjectType);
  const [credentials, setCredentialsState] = React.useState<CredentialDrafts>(
    {}
  );
  const [slideBack, setSlideBackState] = React.useState<(() => void) | null>(
    null
  );
  const [slideAction, setSlideAction] = React.useState<{
    label: string;
    onClick: () => void;
    pending?: boolean;
  } | null>(null);
  const [footerHidden, setFooterHidden] = React.useState(false);
  const [stepValidity, setStepValidityState] = React.useState<
    Record<number, boolean>
  >({});

  // Wrap so useState stores the handler itself rather than treating a function
  // value as a state updater.
  const setSlideBack = React.useCallback(
    (handler: (() => void) | null) => setSlideBackState(() => handler),
    []
  );

  const setStepValidity = React.useCallback((index: number, valid: boolean) => {
    setStepValidityState((prev) =>
      prev[index] === valid ? prev : { ...prev, [index]: valid }
    );
  }, []);

  // The first slide (welcome) has no focusable content, so base-ui's default
  // "focus the first focusable element" would land on a control in a later
  // slide and scroll the carousel there. Send initial focus to a safe sentinel
  // outside the carousel track instead.
  const initialFocusRef = React.useRef<HTMLSpanElement>(null);

  // A single exit is reported once: a deliberate complete must not also fire a
  // "skip" when the resulting state change closes the dialog.
  const exitHandledRef = React.useRef(false);

  // Reset on (re)open. The modal popup unmounts on close, so <ModalCarousel>
  // remounts fresh at slide 0; we just resync the mirrored index + flags.
  React.useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setFooterHidden(false);
      exitHandledRef.current = false;
    }
  }, [open]);

  const isFirst = selectedIndex === 0;
  const isLast = total > 0 && selectedIndex === total - 1;
  const canAdvance = stepValidity[selectedIndex] ?? true;

  // Selecting only records the choice — advancing is always a deliberate
  // "Continue" click, never an automatic jump.
  const selectSegment = (value: OnboardingSegment) => {
    setSegment(value);
    onSegmentSelect?.(value);
  };

  const setPlatforms = (next: OnboardingPlatform[]) => {
    setPlatformsState(next);
    onPlatformsChange?.(next);
  };

  const selectVolume = (value: OnboardingVolume) => {
    setVolume(value);
    onVolumeSelect?.(value);
  };

  const setProjectName = (value: string) => {
    setProjectNameState(value);
    onProjectNameChange?.(value);
  };

  const selectProjectType = (value: ProjectType) => {
    setProjectTypeState(value);
    onProjectTypeSelect?.(value);
  };

  const setCredential = (
    provider: OnboardingPlatform,
    field: keyof CredentialDraft,
    value: string,
  ) => {
    setCredentialsState((prev) => {
      const current = prev[provider] ?? { appId: "", appSecret: "" };
      const next = { ...prev, [provider]: { ...current, [field]: value } };
      onCredentialsChange?.(next);
      return next;
    });
  };

  // Records completion (server-side $set + conversion event) but deliberately
  // does NOT close the modal — the terminal hand-off slide still needs to show.
  // Marking the exit handled here means the eventual close won't double-fire a
  // "skip".
  const complete = () => {
    if (exitHandledRef.current) return;
    exitHandledRef.current = true;
    onComplete?.();
  };

  // Advancing forward is the only deliberate "I'm done with this step" signal
  // (drag is off; the footer's Next is the sole forward control), so it's where
  // the funnel's step event is emitted — never on an automatic jump.
  const next = () => {
    onStepComplete?.({ stepIndex: selectedIndex, stepCount: total });
    carouselRef.current?.scrollNext();
  };

  const skip = () => {
    if (exitHandledRef.current) return;
    exitHandledRef.current = true;
    onSkip?.({ step: selectedIndex, stepCount: total });
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    // Any close that wasn't an explicit completion is an implied skip.
    if (!next) skip();
  };

  const value: OnboardingFlowContext = {
    selectedIndex,
    total,
    isFirst,
    isLast,
    canAdvance,
    setStepValidity,
    segment,
    selectSegment,
    platforms,
    setPlatforms,
    volume,
    selectVolume,
    projectName,
    setProjectName,
    projectType,
    selectProjectType,
    credentials,
    setCredential,
    slideBack,
    setSlideBack,
    slideAction,
    setSlideAction,
    footerHidden,
    setFooterHidden,
    next,
    back: () => carouselRef.current?.scrollPrev(),
    complete,
    billingTeamId,
    skip,
  };

  return (
    <OnboardingContext.Provider value={value}>
      <Modal open={open} onOpenChange={handleOpenChange}>
        <ModalContent
          layout="framed"
          data-slot="onboarding"
          className={cn("max-w-xl", className)}
          initialFocus={initialFocusRef}
        >
          <span ref={initialFocusRef} tabIndex={-1} className="sr-only" />
          <ModalTitle className="sr-only">{t("onboarding.title")}</ModalTitle>
          {/* ModalCarousel owns the carousel state; the sync bridges it back to
              this flow context. The consumer's OnboardingContent + OnboardingFooter
              live inside it so both read the same carousel. */}
          <ModalCarousel>
            <OnboardingCarouselSync
              controlsRef={carouselRef}
              onIndex={setSelectedIndex}
              onTotal={setTotal}
            />
            {children}
          </ModalCarousel>
        </ModalContent>
      </Modal>
    </OnboardingContext.Provider>
  );
}

/**
 * Lives inside {@link ModalCarousel} and bridges its encapsulated carousel state
 * up to the {@link Onboarding} flow: mirrors index/total into the flow's state
 * (so the close handler can read the active slide) and stashes the scroll
 * controls in a ref (so the flow's `next`/`back` can drive the track). Renders
 * nothing.
 */
function OnboardingCarouselSync({
  controlsRef,
  onIndex,
  onTotal,
}: {
  controlsRef: React.RefObject<{
    scrollNext: () => void;
    scrollPrev: () => void;
  } | null>;
  onIndex: (index: number) => void;
  onTotal: (total: number) => void;
}) {
  const { index, total, scrollNext, scrollPrev } = useModalCarousel();
  React.useEffect(() => {
    controlsRef.current = { scrollNext, scrollPrev };
  }, [controlsRef, scrollNext, scrollPrev]);
  React.useEffect(() => {
    onIndex(index);
  }, [index, onIndex]);
  React.useEffect(() => {
    onTotal(total);
  }, [total, onTotal]);
  return null;
}

/** The sliding region. Wraps the slides; drag is off so steps are deliberate
 * (nav buttons only). */
export function OnboardingContent({
  className,
  children,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ModalCarouselViewport data-slot="onboarding-content" className={className}>
      {/* `toArray` drops conditional `null` slides (e.g. the white-label-only
          keys step) so the index is contiguous over the slides actually
          rendered — keeping it aligned with the provider's step mapping. */}
      {React.Children.toArray(children).map((child, index) => (
        <StepIndexContext.Provider key={index} value={index}>
          {child}
        </StepIndexContext.Provider>
      ))}
    </ModalCarouselViewport>
  );
}

/** The standard content-slide primitive: a centered title + body, with a
 * placeholder illustration that `media` (or `children`) can override. Concrete
 * slides (e.g. `ConnectSlide`) compose this. */
export function OnboardingSlide({
  title,
  body,
  media,
  className,
  children,
}: {
  body: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  media?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <ModalSlide data-slot="onboarding-slide" className={cn("ps-0", className)}>
      <div className="flex flex-col items-center gap-6 p-8 text-center">
        {media ?? (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-linear-to-br from-primary/10 to-accent">
            <span className="font-heading px-6 text-3xl font-semibold text-primary/40">
              {title}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm/relaxed text-muted-foreground">{body}</p>
        </div>
        {children}
      </div>
    </ModalSlide>
  );
}

/** Progress dots + navigation. Closing via the ✕ / esc / backdrop is the
 * implied "skip", so there's no explicit skip control here. */
export function OnboardingFooter({ className }: { className?: string }) {
  const { t } = useTranslation();
  const {
    selectedIndex,
    total,
    isFirst,
    isLast,
    canAdvance,
    slideBack,
    slideAction,
    footerHidden,
    next,
    back,
    complete,
  } = useOnboardingFlow();

  // The terminal hand-off slide hides the footer entirely — its own in-body CTA
  // is the only way forward.
  if (footerHidden) return null;

  // A slide-level Back override means we're inside a slide's sub-view: Back pops
  // that view. The forward button is suppressed unless the sub-view supplies its
  // own primary action (e.g. "Done" on the edit-platforms screen).
  const inSubView = slideBack != null;
  const backHandler = slideBack ?? back;
  const showBack = inSubView || !isFirst;

  return (
    <div
      data-slot="onboarding-footer"
      className={cn(
        "flex items-center justify-between gap-4 border-t border-border p-4",
        className,
      )}
    >
      <div className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full bg-border transition-all",
              i === selectedIndex ? "w-4 bg-primary" : "w-1.5",
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {showBack ? (
          <Button
            variant="ghost"
            size="default"
            onClick={backHandler}
            disabled={slideAction?.pending}
          >
            {t("common.back")}
          </Button>
        ) : null}
        {slideAction ? (
          <Button
            size="default"
            onClick={slideAction.onClick}
            disabled={slideAction.pending}
          >
            {slideAction.pending ? <Spinner /> : null}
            {slideAction.label}
          </Button>
        ) : inSubView ? null : isLast ? (
          <Button size="default" onClick={complete}>
            {t("onboarding.finish")}
          </Button>
        ) : (
          <Button size="default" onClick={next} disabled={!canAdvance}>
            {t("common.next")}
          </Button>
        )}
      </div>
    </div>
  );
}
