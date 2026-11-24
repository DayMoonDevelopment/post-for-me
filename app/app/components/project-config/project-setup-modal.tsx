import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import type { SetupActionDialogProps } from "~/components/setup-action-dialog";
import type { loader as settingsLoader } from "~/routes/protected/_project.projects.$projectId.settings._index/route.loader";

import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalTitle,
  ModalView,
  ModalViews,
  useModalViews,
} from "~/components/modal";
import { useOptionalSetupContext } from "~/components/setup-context";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import { useProviderCredential } from "~/hooks/use-provider-credential";
import {
  credentialComplete,
  credentialsByProvider,
  primaryVariant,
} from "~/lib/brand-readiness";
import {
  isOnboardingPlatform,
  type OnboardingPlatform,
  type SocialProvider,
} from "~/lib/onboarding";
import { PLATFORM_BRANDS, platformMeta } from "~/lib/platform-meta";
import { Button } from "~/ui/button";
import { Spinner } from "~/ui/spinner";

import {
  ProjectKeyFields,
  ProjectPlatformPicker,
  ProjectReviewHub,
} from "./project-review";

/** The view-stack key for a platform's key-entry sub-view. */
function keysView(platform: OnboardingPlatform) {
  return `keys:${platform}`;
}

/** Fixed-height frame so the modal never resizes between views. */
const BODY_HEIGHT = "h-[clamp(26rem,72vh,34rem)]";

/**
 * "Finish setting up your project" as the shared "Review your project" screen on
 * the `Modal` standard — the same review hub the onboarding flow shows, here over
 * an EXISTING project. Editing platforms and entering keys are in-modal
 * {@link ModalViews} sub-views that save to the `/projects/:id/settings` action
 * (so the modal and the settings page share data + mutations). Controlled by the
 * launchpad checklist; the active project comes from the setup context.
 */
export function ProjectSetupModal({
  open,
  onOpenChange,
  defaultOpen,
}: SetupActionDialogProps) {
  const { t } = useTranslation();
  const ctx = useOptionalSetupContext();
  const projectId = ctx?.projectId ?? null;

  return (
    <Modal open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
      <ModalContent
        layout="framed"
        data-slot="project-setup-modal"
        className="sm:max-w-xl"
      >
        <ModalTitle className="sr-only">
          {t("projectSettings.modalTitle")}
        </ModalTitle>
        {/* Mounts fresh on each open (the popup unmounts when closed), so it
            always refetches the latest config. */}
        {projectId ? (
          <ProjectSetupReview
            projectId={projectId}
            onClose={() => onOpenChange?.(false)}
          />
        ) : null}
      </ModalContent>
    </Modal>
  );
}

function ProjectSetupReview({
  projectId,
  onClose,
}: {
  onClose: () => void;
  projectId: string;
}) {
  const fetcher = useFetcher<typeof settingsLoader>();

  React.useEffect(() => {
    if (fetcher.state === "idle" && !fetcher.data) {
      fetcher.load(`/projects/${projectId}/settings`);
    }
  }, [fetcher, projectId]);

  if (!fetcher.data) {
    return (
      <div className={`flex ${BODY_HEIGHT} items-center justify-center text-muted-foreground`}>
        <Spinner />
      </div>
    );
  }

  const { project, credentials, supportedProviders } = fetcher.data;
  const isWhiteLabel = project.type === "white-label";
  // The setup modal only deals with the base brands, so narrow the (now wider)
  // provider ids back to OnboardingPlatform at this boundary.
  const baseSupported = supportedProviders.filter(isOnboardingPlatform);
  // A brand can span two provider rows (Instagram / TikTok connection methods),
  // so brand state is resolved against ALL of a brand's variants rather than a
  // row whose id happens to match the brand — see `~/lib/brand-readiness`.
  const byProvider = credentialsByProvider(credentials);
  const configuredBrands = PLATFORM_BRANDS.filter((brand) =>
    brand.variants.some((variant) => byProvider.has(variant.id)),
  );
  // White-label: the configured platforms are its credential rows (editable +
  // keyed). Quickstart: every supported platform is available via shared
  // credentials (informational — no editing, no keys).
  const enabled = isWhiteLabel
    ? configuredBrands
    : PLATFORM_BRANDS.filter((brand) => baseSupported.includes(brand.id));
  // A brand counts as keyed once EVERY method it has enabled is keyed.
  const keyed = new Set(
    configuredBrands
      .filter((brand) =>
        brand.variants
          .filter((variant) => byProvider.has(variant.id))
          .every((variant) => credentialComplete(byProvider.get(variant.id))),
      )
      .map((brand) => brand.id),
  );
  const selected = configuredBrands.map((brand) => brand.id);

  return (
    <ModalViews defaultView="hub" className={BODY_HEIGHT}>
      <ModalView value="hub">
        <HubView
          name={project.name}
          type={project.type}
          enabled={enabled}
          keyed={keyed}
          editable={isWhiteLabel}
        />
      </ModalView>
      {isWhiteLabel ? (
        <>
          <ModalView value="platforms">
            <PlatformsView
              projectId={projectId}
              supportedProviders={baseSupported}
              selected={selected}
            />
          </ModalView>
          {enabled.map((brand) => (
            <ModalView key={brand.id} value={keysView(brand.id)}>
              <KeysView
                projectId={projectId}
                platform={brand.id}
                // Keys belong to a connection METHOD, not a brand — write them
                // to the row this project actually uses (the Business API row
                // for TikTok, not the Standard one that shares the brand id).
                provider={primaryVariant(brand, byProvider).id}
              />
            </ModalView>
          ))}
        </>
      ) : null}
      <SetupFooter onClose={onClose} />
    </ModalViews>
  );
}

// --- View frame -------------------------------------------------------------

function ViewBody({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}

function ViewHeader({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0 px-6 pt-6 pb-4">{children}</div>;
}

function ViewScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
      <div className="flex min-h-full flex-col gap-4">{children}</div>
    </div>
  );
}

// --- Views ------------------------------------------------------------------

function HubView({
  name,
  type,
  enabled,
  keyed,
  editable,
}: {
  editable: boolean;
  enabled: Parameters<typeof ProjectReviewHub>[0]["enabled"];
  keyed: ReadonlySet<OnboardingPlatform>;
  name: string;
  type: Parameters<typeof ProjectReviewHub>[0]["type"];
}) {
  const { t } = useTranslation();
  const { push } = useModalViews();
  return (
    <ViewBody>
      <ViewHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.review.heading")}
        </h2>
      </ViewHeader>
      <ViewScroll>
        <ProjectReviewHub
          name={name}
          type={type}
          enabled={enabled}
          keyed={keyed}
          onEditPlatforms={editable ? () => push("platforms") : undefined}
          onAddKeys={(platform) => push(keysView(platform))}
        />
      </ViewScroll>
    </ViewBody>
  );
}

/** Edit which platforms the project uses (saves via the `platforms` intent). */
function PlatformsView({
  projectId,
  supportedProviders,
  selected,
}: {
  projectId: string;
  selected: OnboardingPlatform[];
  supportedProviders: OnboardingPlatform[];
}) {
  const { t } = useTranslation();
  const { pop } = useModalViews();
  const fetcher = useFetcher();
  useActionErrorToast(fetcher);
  const [value, setValue] = React.useState<OnboardingPlatform[]>(selected);
  const pending = fetcher.state !== "idle";

  // Return to the hub once the save lands (the hub's data revalidates).
  React.useEffect(() => {
    if (fetcher.state === "idle" && (fetcher.data as { ok?: boolean })?.ok) {
      pop();
    }
  }, [fetcher.state, fetcher.data, pop]);

  const options = PLATFORM_BRANDS.filter((brand) =>
    supportedProviders.includes(brand.id),
  );
  const save = () =>
    fetcher.submit(
      { intent: "platforms", platforms: value.join(",") },
      { method: "post", action: `/projects/${projectId}/settings` },
    );

  return (
    <ViewBody>
      <ViewHeader>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {t("onboarding.review.editPlatformsHeading")}
        </h2>
        <p className="text-sm/relaxed text-muted-foreground">
          {t("onboarding.platforms.subheading")}
        </p>
      </ViewHeader>
      <ViewScroll>
        <ProjectPlatformPicker
          value={value}
          onValueChange={setValue}
          options={options}
        />
        <div className="mt-auto flex justify-end pt-2">
          <Button onClick={save} disabled={pending}>
            {pending ? <Spinner /> : null}
            {t("projectSettings.save")}
          </Button>
        </div>
      </ViewScroll>
    </ViewBody>
  );
}

/** Enter one platform's developer keys (saves via the `credentials` intent). */
function KeysView({
  projectId,
  platform,
  provider,
}: {
  /** The brand, for the heading + icon. */
  platform: OnboardingPlatform;
  projectId: string;
  /** The `social_provider` row the keys are written to. */
  provider: SocialProvider;
}) {
  const { t } = useTranslation();
  const { pop } = useModalViews();
  const fetcher = useFetcher();
  useActionErrorToast(fetcher);
  // Stored values never ride the loader — drilling into this view IS the
  // request for them, so fetch on mount through the dedicated endpoint.
  const { credential } = useProviderCredential({
    projectId,
    provider,
    enabled: true,
  });
  const [draft, setDraft] = React.useState({ appId: "", appSecret: "" });
  const loadedId = credential?.appId ?? "";
  const loadedSecret = credential?.appSecret ?? "";
  React.useEffect(() => {
    setDraft({ appId: loadedId, appSecret: loadedSecret });
  }, [loadedId, loadedSecret]);
  const pending = fetcher.state !== "idle";
  const meta = platformMeta(platform);

  React.useEffect(() => {
    if (fetcher.state === "idle" && (fetcher.data as { ok?: boolean })?.ok) {
      pop();
    }
  }, [fetcher.state, fetcher.data, pop]);

  const save = () =>
    fetcher.submit(
      {
        intent: "credentials",
        credentials: JSON.stringify([
          { provider, appId: draft.appId, appSecret: draft.appSecret },
        ]),
      },
      { method: "post", action: `/projects/${projectId}/settings` },
    );

  return (
    <ViewBody>
      <ViewHeader>
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
      </ViewHeader>
      <ViewScroll>
        <ProjectKeyFields
          platform={platform}
          appId={draft.appId}
          appSecret={draft.appSecret}
          onChange={(field, val) => setDraft((d) => ({ ...d, [field]: val }))}
        />
        <div className="mt-auto flex justify-end pt-2">
          <Button onClick={save} disabled={pending}>
            {pending ? <Spinner /> : null}
            {t("projectSettings.save")}
          </Button>
        </div>
      </ViewScroll>
    </ViewBody>
  );
}

/** Footer: Back to pop a sub-view, or Done to close from the hub. */
function SetupFooter({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { canGoBack, pop } = useModalViews();
  return (
    <ModalFooter className={canGoBack ? "sm:justify-start" : "sm:justify-end"}>
      {canGoBack ? (
        <Button variant="ghost" onClick={pop}>
          {t("common.back")}
        </Button>
      ) : (
        <Button onClick={onClose}>{t("common.done")}</Button>
      )}
    </ModalFooter>
  );
}
