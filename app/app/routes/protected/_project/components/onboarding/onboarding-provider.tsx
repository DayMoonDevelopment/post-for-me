import { usePostHog } from "posthog-js/react";
import * as React from "react";
import { useFetcher } from "react-router";

import type { Project, ProjectType } from "~/lib/types/project";

import {
  ONBOARDING_STEPS,
  type OnboardingPlatform,
  type OnboardingSegment,
  type OnboardingVolume,
} from "~/lib/onboarding";

import {
  type CredentialDrafts,
  Onboarding,
  OnboardingContent,
  OnboardingFooter,
} from "./onboarding";
import { useOnboardingAnalytics } from "./onboarding-analytics";
import {
  BillingSlide,
  PlatformsSlide,
  ProjectNameSlide,
  ProjectTypeSlide,
  ReviewSlide,
  SegmentSlide,
  VolumeSlide,
  WelcomeSlide,
} from "./slides";

type OnboardingContextValue = {
  /** Close onboarding without recording a dismissal. */
  closeOnboarding: () => void;
  /** Whether the onboarding modal is currently open. */
  open: boolean;
  /** Open onboarding on demand (e.g. the sidebar "Getting started" entry). */
  openOnboarding: () => void;
};

const OnboardingContext =
  React.createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an <OnboardingProvider>");
  }
  return context;
}

/**
 * App-wide onboarding layer. Lives above the sidebar/content in the protected
 * shell so the modal overlays any authenticated screen.
 *
 * - Auto-opens once per session when `autoOpen` is true. That value is the
 *   `show_onboarding` feature flag, resolved server-side in the `_protected`
 *   loader (gated on the `onboarding_completed_version` person property) and
 *   passed down — evaluating it server-side keeps ad blockers from suppressing
 *   the auto-open and avoids a first-paint flash.
 * - Streams the in-flow interaction detail to PostHog CLIENT-side via
 *   `useOnboardingAnalytics` (step-completed funnel events, per-choice
 *   selections, dismissal) — the deliberate carve-out for "hard path" journey
 *   data (see `onboarding-analytics.ts`).
 * - Persists the durable outcome via the `/onboarding` resource action
 *   (server-side capture — ad-blocker proof): completion vs. skip are distinct
 *   events, and both stamp the final segment / platforms / volume person
 *   properties as the authoritative end-of-flow snapshot.
 */
export function OnboardingProvider({
  autoOpen = false,
  project,
  children,
}: {
  autoOpen?: boolean;
  children: React.ReactNode;
  /** The default project this flow configures (renamed + mode set on the
   * project step). Absent only in contexts with no project yet. */
  project?: Project;
}) {
  const posthog = usePostHog();
  const analytics = useOnboardingAnalytics();
  const fetcher = useFetcher();
  const [open, setOpen] = React.useState(false);

  // Only auto-open once per session; re-opening is always explicit afterward.
  const handledRef = React.useRef(false);
  // Latest selections, held client-side and persisted once with complete/skip
  // (a server round-trip per toggle would be wasteful; the durable record is
  // the end-of-flow $set, and the per-choice signal is already captured
  // client-side via `onboarding_option_selected`).
  const segmentRef = React.useRef<OnboardingSegment | null>(null);
  const platformsRef = React.useRef<OnboardingPlatform[]>([]);
  const volumeRef = React.useRef<OnboardingVolume | null>(null);
  // Project config is committed to the DB as the user advances off its step
  // (see handleStepComplete), so its latest value is held in refs too.
  const projectNameRef = React.useRef<string>(project?.name ?? "");
  // Quickstart is always the default selection (the recommended fast path), so
  // the commit ref starts there too — otherwise leaving the cards untouched
  // would commit the existing project's type instead of the shown default.
  const projectTypeRef = React.useRef<ProjectType>("quickstart");
  const credentialsRef = React.useRef<CredentialDrafts>({});

  React.useEffect(() => {
    if (autoOpen && !handledRef.current) {
      handledRef.current = true;
      setOpen(true);
      posthog?.capture("onboarding_started", { trigger: "auto" });
    }
  }, [autoOpen, posthog]);

  const submit = React.useCallback(
    (fields: Record<string, string>) => {
      fetcher.submit(fields, { method: "post", action: "/onboarding" });
    },
    [fetcher]
  );

  const openOnboarding = React.useCallback(() => {
    handledRef.current = true;
    setOpen(true);
    posthog?.capture("onboarding_started", { trigger: "manual" });
  }, [posthog]);

  const closeOnboarding = React.useCallback(() => setOpen(false), []);

  const handleSegmentSelect = React.useCallback(
    (segment: OnboardingSegment) => {
      segmentRef.current = segment;
      analytics.trackOptionSelected({
        step: "segment",
        value: segment,
        selected: true,
        selection_count: 1,
      });
    },
    [analytics]
  );

  const handlePlatformsChange = React.useCallback(
    (platforms: OnboardingPlatform[]) => {
      // Diff against the prior set so each toggle is captured as its own
      // select/de-select (the "clicking around" signal).
      const prev = platformsRef.current;
      platformsRef.current = platforms;
      for (const value of platforms.filter((p) => !prev.includes(p))) {
        analytics.trackOptionSelected({
          step: "platforms",
          value,
          selected: true,
          selection_count: platforms.length,
        });
      }
      for (const value of prev.filter((p) => !platforms.includes(p))) {
        analytics.trackOptionSelected({
          step: "platforms",
          value,
          selected: false,
          selection_count: platforms.length,
        });
      }
    },
    [analytics]
  );

  const handleVolumeSelect = React.useCallback(
    (volume: OnboardingVolume) => {
      volumeRef.current = volume;
      analytics.trackOptionSelected({
        step: "volume",
        value: volume,
        selected: true,
        selection_count: 1,
      });
    },
    [analytics]
  );

  const handleProjectNameChange = React.useCallback((name: string) => {
    projectNameRef.current = name;
  }, []);

  const handleProjectTypeSelect = React.useCallback(
    (type: ProjectType) => {
      projectTypeRef.current = type;
      analytics.trackOptionSelected({
        step: "project_type",
        value: type,
        selected: true,
        selection_count: 1,
      });
    },
    [analytics]
  );

  const handleCredentialsChange = React.useCallback(
    (credentials: CredentialDrafts) => {
      credentialsRef.current = credentials;
    },
    []
  );

  // Commit the project config (name + mode) — fired when leaving the project
  // step. Idempotent, so revisiting the step and advancing again just re-saves.
  const commitProject = React.useCallback(() => {
    if (!project) return;
    submit({
      intent: "project",
      project_id: project.id,
      name: projectNameRef.current,
      type: projectTypeRef.current,
    });
  }, [project, submit]);

  // Commit the white-label developer keys — fired when leaving the keys step.
  // Only entries with BOTH fields filled are sent (the server drops the rest
  // too); an all-blank step posts nothing.
  //
  // ORDERING DEPENDENCY: the credentials RLS policy is "non-system only"
  // (`WITH CHECK (... AND NOT is_system_project(project_id))`), so the project
  // must already be white-label before a credentials row can be written. The
  // keys step always follows the project step (which commits `is_system=false`
  // for white-label), so this ordering is what makes the upsert pass RLS — keep
  // the project commit ahead of the credentials commit.
  const commitCredentials = React.useCallback(() => {
    if (!project) return;
    const entries = Object.entries(credentialsRef.current)
      .filter(([, draft]) => draft && draft.appId.trim() && draft.appSecret.trim())
      .map(([provider, draft]) => ({
        provider,
        appId: draft!.appId.trim(),
        appSecret: draft!.appSecret.trim(),
      }));
    if (entries.length === 0) return;
    submit({
      intent: "credentials",
      project_id: project.id,
      credentials: JSON.stringify(entries),
    });
  }, [project, submit]);

  // The funnel's step event. Resolve the committed selection for the slide
  // being left so the funnel can be broken down by what people chose.
  const handleStepComplete = React.useCallback(
    ({ stepIndex, stepCount }: { stepCount: number; stepIndex: number; }) => {
      const step = ONBOARDING_STEPS[stepIndex];
      if (!step) return;

      // Commit the durable DB writes on the way out of their steps. Project
      // (name + mode) commits on leaving `project_type` — both refs are set by
      // then — and MUST land before credentials: the credentials RLS policy is
      // non-system-only, so the project has to already be white-label when its
      // keys are written. The step order (project_type before review) ensures it.
      if (step === "project_type") commitProject();
      if (step === "review") commitCredentials();

      const selection =
        step === "segment"
          ? segmentRef.current
          : step === "platforms"
            ? platformsRef.current
            : step === "volume"
              ? volumeRef.current
              : step === "project_type"
                ? projectTypeRef.current
                : null;
      analytics.trackStepCompleted({
        step,
        step_index: stepIndex,
        step_count: stepCount,
        selection,
        selection_count: Array.isArray(selection)
          ? selection.length
          : selection
            ? 1
            : 0,
      });
    },
    [analytics, commitProject, commitCredentials]
  );

  // Records the durable completion outcome. Does NOT close the modal — the
  // terminal hand-off slide (billing) still shows; closing happens when the user
  // continues to billing (or dismisses).
  const handleComplete = React.useCallback(() => {
    submit({
      intent: "complete",
      segment: segmentRef.current ?? "",
      platforms: platformsRef.current.join(","),
      volume: volumeRef.current ?? "",
    });
  }, [submit]);

  const handleSkip = React.useCallback(
    ({ step, stepCount }: { step: number; stepCount: number }) => {
      const lastStep = ONBOARDING_STEPS[step];
      if (lastStep) {
        analytics.trackDismissed({
          last_step: lastStep,
          last_step_index: step,
          step_count: stepCount,
        });
      }
      submit({
        intent: "skip",
        last_step: String(step),
        segment: segmentRef.current ?? "",
        platforms: platformsRef.current.join(","),
        volume: volumeRef.current ?? "",
      });
      setOpen(false);
    },
    [submit, analytics]
  );

  const value = React.useMemo(
    () => ({ open, openOnboarding, closeOnboarding }),
    [open, openOnboarding, closeOnboarding]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <Onboarding
        open={open}
        onOpenChange={setOpen}
        onSegmentSelect={handleSegmentSelect}
        onPlatformsChange={handlePlatformsChange}
        onVolumeSelect={handleVolumeSelect}
        initialProjectName={project?.name ?? ""}
        initialProjectType="quickstart"
        onProjectNameChange={handleProjectNameChange}
        onProjectTypeSelect={handleProjectTypeSelect}
        onCredentialsChange={handleCredentialsChange}
        onComplete={handleComplete}
        billingTeamId={project?.teamId ?? null}
        onStepComplete={handleStepComplete}
        onSkip={handleSkip}
      >
        <OnboardingContent>
          <WelcomeSlide />
          <SegmentSlide />
          <PlatformsSlide />
          <VolumeSlide />
          <ProjectNameSlide />
          <ProjectTypeSlide />
          <ReviewSlide />
          <BillingSlide />
        </OnboardingContent>
        <OnboardingFooter />
      </Onboarding>
    </OnboardingContext.Provider>
  );
}
