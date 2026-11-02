import { useTranslation } from "react-i18next";

import type { OnboardingPlatform } from "~/lib/onboarding";
import type { ProjectType } from "~/lib/types/project";

import { EditIcon, SuccessIcon, WarningIcon } from "~/icons";
import { type PlatformMeta, PLATFORMS } from "~/lib/platform-meta";
import { Alert, AlertTitle } from "~/ui/alert";
import { Button } from "~/ui/button";
import {
  Choicebox,
  ChoiceboxItem,
  ChoiceboxItemContent,
  ChoiceboxItemIcon,
  ChoiceboxItemIndicator,
  ChoiceboxItemTitle,
} from "~/ui/choicebox";
import { Field, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";
import { ProjectTypeAvatar } from "~/ui/project-type-badge";

/**
 * The shared "Review your project" surface — the screen the onboarding review
 * slide, the project-setup modal, and the settings-page overview all reuse. All
 * parts are presentational + props-driven; each consumer supplies the data and
 * wires the edit/add-keys navigation to its own surface (carousel sub-views,
 * modal view-stack, or a page link).
 */

/** Project identity: type icon + name + type label + an optional incomplete
 * badge. Reused as the review card's header and as the settings-page overview. */
export function ProjectReviewIdentity({
  name,
  type,
  incomplete,
}: {
  incomplete?: boolean;
  name: string;
  type: ProjectType;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <ProjectTypeAvatar type={type} className="size-10" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-heading text-base font-semibold text-foreground">
          {name}
        </span>
        <div className="flex items-center gap-2">
          <span data-brand={type} className="text-xs font-medium text-primary">
            {t(
              `onboarding.project.${type === "quickstart" ? "quickstart" : "whiteLabel"}.title`,
            )}
          </span>
          {incomplete ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[0.6875rem] font-medium text-warning-foreground">
              <WarningIcon className="size-3 text-warning" />
              {t("onboarding.review.incomplete")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The enabled platforms as an overlapping brand-icon stack. */
function PlatformStack({ enabled }: { enabled: PlatformMeta[] }) {
  const { t } = useTranslation();
  if (enabled.length === 0) {
    return (
      <span className="text-xs/relaxed text-muted-foreground">
        {t("onboarding.review.noPlatforms")}
      </span>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 items-center">
      {enabled.map((platform) => (
        <span
          key={platform.id}
          title={platform.label}
          className="-ms-3 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground ring-2 ring-popover first:ms-0 [&_svg]:size-4"
        >
          <platform.icon />
        </span>
      ))}
    </div>
  );
}

/** One platform's developer-key row: brand icon + name + Add-keys (or done). */
function KeyRow({
  platform,
  added,
  onAddKeys,
}: {
  added: boolean;
  onAddKeys: () => void;
  platform: PlatformMeta;
}) {
  const { t } = useTranslation();
  return (
    <Alert className="flex shrink-0 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground [&_svg]:size-4">
        <platform.icon />
      </span>
      <AlertTitle className="line-clamp-none flex-1">
        {platform.label}
      </AlertTitle>
      {added ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary [&_svg]:size-3.5">
          <SuccessIcon />
          {t("onboarding.review.keysAdded")}
        </span>
      ) : (
        <Button size="sm" onClick={onAddKeys}>
          {t("onboarding.review.addKeys")}
        </Button>
      )}
    </Alert>
  );
}

/**
 * The review body: a summary card (identity + platforms stack + Edit) and, for
 * white-label projects, the per-platform developer-key rows. Chrome-neutral —
 * the consumer supplies the heading + scroll frame.
 */
export function ProjectReviewHub({
  name,
  type,
  enabled,
  keyed,
  onEditPlatforms,
  onAddKeys,
}: {
  /** The configured platforms, as metadata (in display order). */
  enabled: PlatformMeta[];
  /** Which platforms have usable keys. */
  keyed: ReadonlySet<OnboardingPlatform>;
  name: string;
  onAddKeys: (platform: OnboardingPlatform) => void;
  /** Omit to hide the Edit control (e.g. quickstart, where the platform set
   * isn't per-project configurable). */
  onEditPlatforms?: () => void;
  type: ProjectType;
}) {
  const { t } = useTranslation();
  const isWhiteLabel = type === "white-label";
  const incomplete =
    isWhiteLabel &&
    (enabled.length === 0 || enabled.some((p) => !keyed.has(p.id)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <ProjectReviewIdentity
          name={name}
          type={type}
          incomplete={incomplete}
        />
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("onboarding.review.platformsLabel")}
          </span>
          <div className="flex items-center justify-between gap-3">
            <PlatformStack enabled={enabled} />
            {onEditPlatforms ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={onEditPlatforms}
              >
                <EditIcon />
                {t("common.edit")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {isWhiteLabel ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              {t("onboarding.review.keysLabel")}
            </span>
            <span className="text-xs/relaxed text-muted-foreground">
              {t("onboarding.review.keysDescription")}
            </span>
          </div>
          {enabled.length > 0 ? (
            enabled.map((platform) => (
              <KeyRow
                key={platform.id}
                platform={platform}
                added={keyed.has(platform.id)}
                onAddKeys={() => onAddKeys(platform.id)}
              />
            ))
          ) : (
            <p className="text-xs/relaxed text-muted-foreground">
              {t("onboarding.review.noPlatforms")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** The platform multi-select grid (edit-platforms sub-view body). */
export function ProjectPlatformPicker({
  value,
  onValueChange,
  options = PLATFORMS,
}: {
  onValueChange: (value: OnboardingPlatform[]) => void;
  options?: PlatformMeta[];
  value: OnboardingPlatform[];
}) {
  return (
    <Choicebox
      multiple
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      value={value}
      onValueChange={(next) => onValueChange(next as OnboardingPlatform[])}
    >
      {options.map((platform) => (
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
  );
}

/** One platform's App ID + App Secret fields (add-keys sub-view body). */
export function ProjectKeyFields({
  platform,
  appId,
  appSecret,
  onChange,
}: {
  appId: string;
  appSecret: string;
  onChange: (field: "appId" | "appSecret", value: string) => void;
  platform: OnboardingPlatform;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`key-${platform}-app-id`}>
          {t("onboarding.keys.appIdLabel")}
        </FieldLabel>
        <Input
          id={`key-${platform}-app-id`}
          value={appId}
          onChange={(event) => onChange("appId", event.target.value)}
          placeholder={t("onboarding.keys.appIdPlaceholder")}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`key-${platform}-app-secret`}>
          {t("onboarding.keys.appSecretLabel")}
        </FieldLabel>
        <Input
          id={`key-${platform}-app-secret`}
          type="password"
          value={appSecret}
          onChange={(event) => onChange("appSecret", event.target.value)}
          placeholder={t("onboarding.keys.appSecretPlaceholder")}
        />
      </Field>
    </>
  );
}
