import type { TFunction } from "i18next";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import type { BrandReadiness } from "~/lib/brand-readiness";
import type { ProviderCredentialStatus, SocialProvider } from "~/lib/onboarding";
import type { BrandMeta, BrandVariant } from "~/lib/platform-meta";
import type { ProjectType } from "~/lib/types/project";

import { ConfirmDialog } from "~/components/confirm-dialog";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
  ModalView,
  ModalViews,
  useModalViews,
} from "~/components/modal";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import { useProviderCredential } from "~/hooks/use-provider-credential";
import { EditIcon, MoreIcon, WarningIcon } from "~/icons";
import { isActionError } from "~/lib/action-result";
import { credentialComplete } from "~/lib/brand-readiness";
import { cn } from "~/lib/utils";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import { ButtonGroup } from "~/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { Fact } from "~/ui/fact";
import { Field, FieldLabel } from "~/ui/field";
import { Hint, HintIcon, HintText } from "~/ui/hint";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/ui/hover-card";
import { Input } from "~/ui/input";
import { InputSecret } from "~/ui/input-secret";
import { Separator } from "~/ui/separator";
import { Spinner } from "~/ui/spinner";

/** Status badge tone per readiness state — the sheet's quick reference. */
const STATE_BADGE = {
  idle: "secondary",
  setup: "warning-light",
  done: "success-light",
} as const;

/** View key for one method's developer-app screen. */
function credentialsView(id: SocialProvider) {
  return `credentials:${id}`;
}

/**
 * What a method's row offers, derived from project type and current state:
 *
 * - `enable` / `disable` — Quickstart (and any method with no developer app to
 *   register, like Bluesky): the method IS its own setup, so the row toggles it.
 * - `setup` — white-label, not yet on: drills into the developer-app screen,
 *   where saving both stores the keys and turns the method on.
 * - `edit` — white-label, already on: same screen, pre-filled. Carries a warning
 *   when the keys are half-entered, since that method can't actually connect.
 */
type MethodAction = "disable" | "edit" | "enable" | "setup";

function methodAction(
  variant: BrandVariant,
  isEnabled: boolean,
  collectsKeys: boolean,
): MethodAction {
  const needsKeys = collectsKeys && variant.requiresKeys !== false;
  if (!needsKeys) return isEnabled ? "disable" : "enable";
  return isEnabled ? "edit" : "setup";
}

/**
 * The per-brand Configure sheet — the one place a platform's setup is managed,
 * for BOTH project types.
 *
 * The sheet is a roster of the brand's CONNECTION METHODS (Instagram Login vs
 * Facebook Login, TikTok's Business vs Standard API), each row owning the one
 * action that applies to it. There's no separate platform-level enable: a brand
 * is on when at least one of its methods is, so enabling the first method and
 * enabling the platform are the same act.
 *
 * A "standard" brand — one method, which needs developer keys — has no roster
 * worth showing, so the sheet opens straight onto that method's developer app.
 */
export function PlatformConfigureDialog({
  projectId,
  projectType,
  readiness,
  credentials,
  trigger,
}: {
  /** Presence booleans for THIS brand's variants, keyed by provider. The VALUES
   * are never in the page payload — the developer-app screen fetches them on
   * demand once a member enters edit mode. */
  credentials: Map<SocialProvider, ProviderCredentialStatus>;
  projectId: string;
  projectType: ProjectType;
  readiness: BrandReadiness;
  trigger: React.ReactElement;
}) {
  const { t } = useTranslation();
  const { brand, enabled } = readiness;
  const fetcher = useFetcher();
  const [open, setOpen] = React.useState(false);
  const action = `/projects/${projectId}/settings`;
  const pending = fetcher.state !== "idle";

  // White-label brings its own developer app per method; quickstart rides Post
  // for Me's shared credentials and never collects keys.
  const collectsKeys = projectType === "white-label";
  const enabledIds = new Set(enabled.map((variant) => variant.id));

  useActionErrorToast(fetcher);

  // Enabling or disabling a method does NOT close the sheet — the roster is the
  // thing you came to work on, and slamming it shut after one row hides the
  // result and forces a reopen to touch the next method. Instead each settled
  // save bumps a revision, which is how a drilled-in screen knows to drop out of
  // edit mode. A failure changes nothing (the error is toasted).
  const settled =
    fetcher.state === "idle" && fetcher.data && !isActionError(fetcher.data);
  const [savedRevision, setSavedRevision] = React.useState(0);
  React.useEffect(() => {
    if (settled) setSavedRevision((revision) => revision + 1);
  }, [settled]);

  /** Write the brand's method set, preserving the brand's own method order. */
  const submitMethods = (
    ids: Set<SocialProvider>,
    keyed?: { appId: string; appSecret: string; provider: SocialProvider },
  ) =>
    fetcher.submit(
      {
        intent: "platform_config",
        brand: brand.id,
        variants: brand.variants
          .filter((variant) => ids.has(variant.id))
          .map((variant) => variant.id)
          .join(","),
        ...(keyed ? { credentials: JSON.stringify([keyed]) } : {}),
      },
      { method: "post", action },
    );

  const enableMethod = (id: SocialProvider) =>
    submitMethods(new Set([...enabledIds, id]));

  const disableMethod = (id: SocialProvider) =>
    submitMethods(new Set([...enabledIds].filter((current) => current !== id)));

  const saveCredentials = (
    id: SocialProvider,
    appId: string,
    appSecret: string,
  ) =>
    submitMethods(new Set([...enabledIds, id]), { provider: id, appId, appSecret });

  // MOST platforms connect exactly one way. "Connection methods" is the
  // exception — it earns a roster only where there's a genuine choice (Instagram,
  // TikTok). Everything else collapses to the one screen that fits it:
  //
  //  - one method, needs keys (white-label)  → straight to the developer app
  //  - one method, nothing to key            → a plain on/off screen
  //  - two methods                           → the roster
  const soleVariant = brand.variants.length === 1 ? brand.variants[0] : null;
  const soleNeedsKeys =
    soleVariant != null && collectsKeys && soleVariant.requiresKeys !== false;
  const opensOnCredentials = soleNeedsKeys;
  const opensSimple = soleVariant != null && !soleNeedsKeys;
  const defaultView = opensOnCredentials
    ? credentialsView(soleVariant.id)
    : opensSimple
      ? "simple"
      : "methods";

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger render={trigger} />
      <ModalContent
        layout="framed"
        data-slot="platform-configure-dialog"
        className="max-w-md"
      >
        {/* `pb-0` hands the spacing below the title to the body's own rhythm, so
            the status line sits one step under it rather than two. */}
        <ModalHeader className="pb-0">
          {/* Mirrors the header's mobile-center / desktop-start alignment, which
              `text-center` alone can't do for an svg. */}
          <brand.icon className="mx-auto mb-1 size-8 sm:mx-0" />
          <ModalTitle>
            {t("projectSettings.platforms.configureTitle", {
              platform: brand.label,
            })}
          </ModalTitle>
        </ModalHeader>

        {/* Remounts per open so a drill-in doesn't persist into the next visit. */}
        <ModalViews key={String(open)} defaultView={defaultView}>
          {/* One method, nothing to configure: no roster, no jargon — just what
              this platform's state means and the one action that changes it. */}
          {soleVariant ? (
            <ModalView value="simple">
              <ModalBody className="flex flex-col gap-4">
                <StatusBand state={readiness.state} />
                <p className="text-xs/relaxed text-muted-foreground">
                  {t(
                    collectsKeys
                      ? enabledIds.has(soleVariant.id)
                        ? "projectSettings.platforms.noKeysBody"
                        : "projectSettings.platforms.noKeysPendingBody"
                      : enabledIds.has(soleVariant.id)
                        ? "projectSettings.platforms.sharedCredsBody"
                        : "projectSettings.platforms.sharedCredsPendingBody",
                    { platform: brand.label },
                  )}
                </p>
              </ModalBody>
              <ModalFooter className="sm:items-center">
                {enabledIds.has(soleVariant.id) ? (
                  <MethodDisableConfirm
                    brand={brand}
                    variant={soleVariant}
                    isOnlyEnabled
                    collectsKeys={collectsKeys}
                    pending={pending}
                    resetKey={savedRevision}
                    onDisable={() => disableMethod(soleVariant.id)}
                  />
                ) : (
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => enableMethod(soleVariant.id)}
                  >
                    {pending ? <Spinner /> : null}
                    {t("projectSettings.platforms.enable")}
                  </Button>
                )}
              </ModalFooter>
            </ModalView>
          ) : null}

          <ModalView value="methods">
            <ModalBody className="flex flex-col gap-4">
              <StatusBand state={readiness.state} />
              {/* Label and list are ONE section, so the body's `gap-4` separates
                  the section from the status band above rather than pushing the
                  first method away from the label naming it. The rows' own
                  `py-2.5` is all the separation the label needs. */}
              <div className="flex flex-col">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("projectSettings.platforms.methodsLabel")}
                  </span>
                  <span className="text-xs/relaxed text-muted-foreground">
                    {t("projectSettings.platforms.methodsHelp")}
                  </span>
                </div>
                <ul className="flex flex-col">
                {brand.variants.map((variant, index) => (
                  <MethodRow
                    key={variant.id}
                    brand={brand}
                    variant={variant}
                    isEnabled={enabledIds.has(variant.id)}
                    keyed={credentialComplete(credentials.get(variant.id))}
                    collectsKeys={collectsKeys}
                    isOnlyEnabled={Boolean(
                      enabledIds.size === 1 && enabledIds.has(variant.id),
                    )}
                    divided={index > 0}
                    pending={pending}
                    resetKey={savedRevision}
                    onEnable={() => enableMethod(variant.id)}
                    onDisable={() => disableMethod(variant.id)}
                  />
                  ))}
                </ul>
              </div>
            </ModalBody>
            <ModalFooter className="sm:items-center">
              <div className="flex items-center gap-2 sm:me-auto">
                <VariantRecommendation brand={brand} />
              </div>
            </ModalFooter>
          </ModalView>

          {brand.variants
            .filter((variant) => collectsKeys && variant.requiresKeys !== false)
            .map((variant) => (
              <ModalView key={variant.id} value={credentialsView(variant.id)}>
                <CredentialsScreen
                  brand={brand}
                  variant={variant}
                  status={credentials.get(variant.id)}
                  projectId={projectId}
                  isEnabled={enabledIds.has(variant.id)}
                  // The roster is the way back; without one there's nothing to
                  // return to, so the screen stands alone.
                  standalone={opensOnCredentials}
                  isOnlyEnabled={Boolean(
                    enabledIds.size === 1 && enabledIds.has(variant.id),
                  )}
                  pending={pending}
                  savedRevision={savedRevision}
                  state={readiness.state}
                  onSave={(appId, appSecret) =>
                    saveCredentials(variant.id, appId, appSecret)
                  }
                  onDisable={() => disableMethod(variant.id)}
                />
              </ModalView>
            ))}
        </ModalViews>
      </ModalContent>
    </Modal>
  );
}

/**
 * The sheet's quick reference, and the rule that everything below it lines up
 * against. It lives in the BODY, not the header: the framed header carries
 * `sm:pe-12` to clear the close button, so a status row placed there would sit
 * inset 3rem on the end while the method rows below sit at 1.5rem — the badge
 * and the separator would both be visibly short of the rows they describe.
 *
 * The trailing `Separator` is a plain sibling so the body's uniform `gap-4`
 * spaces it evenly between the status line and whatever follows.
 */
function StatusBand({ state }: { state: BrandReadiness["state"] }) {
  const { t } = useTranslation();
  return (
    <>
      <Fact
        orientation="horizontal"
        label={t("projectSettings.platforms.statusLabel")}
      >
        <Badge variant={STATE_BADGE[state]} size="sm">
          {t(`projectSettings.platforms.state.${state}`)}
        </Badge>
      </Fact>
      <Separator />
    </>
  );
}

/** One connection method: its name, and the single action that applies to it. */
function MethodRow({
  brand,
  variant,
  isEnabled,
  keyed,
  collectsKeys,
  isOnlyEnabled,
  divided,
  pending,
  resetKey,
  onEnable,
  onDisable,
}: {
  brand: BrandMeta;
  collectsKeys: boolean;
  divided: boolean;
  isEnabled: boolean;
  isOnlyEnabled: boolean;
  keyed: boolean;
  onDisable: () => void;
  onEnable: () => void;
  pending: boolean;
  /** Bumped per settled write — see `confirmResetKey`. */
  resetKey: number;
  variant: BrandVariant;
}) {
  const { t } = useTranslation();
  const { push } = useModalViews();
  const kind = methodAction(variant, isEnabled, collectsKeys);
  const openCredentials = () => push(credentialsView(variant.id));

  return (
    <li
      className={cn(
        "flex items-center gap-3 py-2.5",
        divided && "border-t border-border",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm text-foreground">
          {variant.optionLabel}
        </span>
        {variant.recommended ? (
          <Badge variant="primary-light" size="sm" radius="full">
            {t("projectSettings.platforms.recommended")}
          </Badge>
        ) : null}
      </span>

      {kind === "enable" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={onEnable}
        >
          {pending ? <Spinner /> : null}
          {t("projectSettings.platforms.enable")}
        </Button>
      ) : null}

      {kind === "disable" ? (
        <ConfirmDialog
          key={resetKey}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={pending}
            >
              {t("projectSettings.platforms.disableMethod")}
            </Button>
          }
          {...disableConfirmProps(t, brand, variant, isOnlyEnabled, collectsKeys)}
          pending={pending}
          onConfirm={onDisable}
        />
      ) : null}

      {kind === "setup" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={openCredentials}
        >
          {t("projectSettings.platforms.setUp")}
        </Button>
      ) : null}

      {/* Edit is the row's action, with Disable demoted into an overflow menu —
          reachable, but never one stray click from the button beside it. The
          warning glyph replaces the pencil when the keys are half-entered, so an
          unusable method is visible without reading the row's state. */}
      {kind === "edit" ? (
        <ButtonGroup>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCredentials}
          >
            {keyed ? <EditIcon /> : <WarningIcon className="text-warning" />}
            {t("common.edit")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="outline" size="icon-sm">
                  <MoreIcon />
                  <span className="sr-only">
                    {t("projectSettings.platforms.moreActions")}
                  </span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <MethodDisableItem
                brand={brand}
                variant={variant}
                isOnlyEnabled={isOnlyEnabled}
                collectsKeys={collectsKeys}
                pending={pending}
                resetKey={resetKey}
                onDisable={onDisable}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      ) : null}
    </li>
  );
}

/** Shared confirm copy: disabling the LAST live method empties the brand, which
 * is the same thing as turning the platform off — so say that instead. */
function disableConfirmProps(
  t: TFunction,
  brand: BrandMeta,
  variant: BrandVariant,
  isOnlyEnabled: boolean,
  collectsKeys: boolean,
) {
  const vars = { platform: brand.label, method: variant.optionLabel };
  return {
    title: t(
      isOnlyEnabled
        ? "projectSettings.platforms.disableConfirmTitle"
        : "projectSettings.platforms.disableMethodConfirmTitle",
      vars,
    ),
    description: t(
      isOnlyEnabled
        ? collectsKeys && variant.requiresKeys !== false
          ? "projectSettings.platforms.disableConfirmBody"
          : "projectSettings.platforms.disableQuickstartConfirmBody"
        : "projectSettings.platforms.disableMethodConfirmBody",
      vars,
    ),
    confirmLabel: t(
      isOnlyEnabled
        ? "projectSettings.platforms.disable"
        : "projectSettings.platforms.disableMethod",
    ),
    destructive: true,
  };
}

/** Disable, as an overflow-menu entry that opens its confirm. `closeOnClick`
 * stays off so the menu doesn't tear down the dialog it just opened. */
function MethodDisableItem({
  brand,
  variant,
  isOnlyEnabled,
  collectsKeys,
  pending,
  resetKey,
  onDisable,
}: {
  brand: BrandMeta;
  collectsKeys: boolean;
  isOnlyEnabled: boolean;
  onDisable: () => void;
  pending: boolean;
  resetKey: number;
  variant: BrandVariant;
}) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      key={resetKey}
      trigger={
        <DropdownMenuItem variant="destructive" closeOnClick={false}>
          {t("projectSettings.platforms.disableMethod")}
        </DropdownMenuItem>
      }
      {...disableConfirmProps(t, brand, variant, isOnlyEnabled, collectsKeys)}
      pending={pending}
      onConfirm={onDisable}
    />
  );
}

/**
 * One method's developer app. Stored keys are MASKED behind a read-only summary
 * — a configured platform is something you glance at far more often than you
 * change, and showing live secrets by default invites both shoulder-surfing and
 * accidental edits. "Edit" is the deliberate switch into the form.
 *
 * A method that isn't on yet has nothing to mask, so it opens in edit mode and
 * its save doubles as the enable.
 */
function CredentialsScreen({
  brand,
  variant,
  status,
  projectId,
  isEnabled,
  standalone,
  isOnlyEnabled,
  pending,
  savedRevision,
  state,
  onSave,
  onDisable,
}: {
  brand: BrandMeta;
  isEnabled: boolean;
  isOnlyEnabled: boolean;
  onDisable: () => void;
  onSave: (appId: string, appSecret: string) => void;
  pending: boolean;
  projectId: string;
  /** Bumped by the sheet each time a write settles. */
  savedRevision: number;
  standalone: boolean;
  state: BrandReadiness["state"];
  /** Presence booleans only. The values arrive separately, on demand. */
  status?: ProviderCredentialStatus;
  variant: BrandVariant;
}) {
  const { t } = useTranslation();
  const { pop } = useModalViews();
  const [editing, setEditing] = React.useState(!isEnabled);
  const [appId, setAppId] = React.useState("");
  const [appSecret, setAppSecret] = React.useState("");

  // The stored values are NOT in the page payload. They're fetched here, only
  // once a member actually enters edit mode on an enabled method, and dropped
  // again the moment they leave it — so a secret is in component state for the
  // span of an edit rather than the life of the session.
  const { credential, loading } = useProviderCredential({
    projectId,
    provider: variant.id,
    enabled: editing && isEnabled,
  });
  const loadedId = credential?.appId ?? "";
  const loadedSecret = credential?.appSecret ?? "";
  React.useEffect(() => {
    setAppId(loadedId);
    setAppSecret(loadedSecret);
  }, [loadedId, loadedSecret]);

  // The sheet stays open after a save, so this screen settles itself: drop back
  // to the masked view, which also discards the fetched values.
  const seenRevision = React.useRef(savedRevision);
  React.useEffect(() => {
    if (savedRevision === seenRevision.current) return;
    seenRevision.current = savedRevision;
    setEditing(false);
  }, [savedRevision]);

  // Meaningless field ids so password-manager keyword heuristics ("app-id",
  // "secret") have nothing to latch onto.
  const uid = React.useId();
  const appIdId = `${uid}-a`;
  const appSecretId = `${uid}-b`;

  const changed = appId !== loadedId || appSecret !== loadedSecret;
  // Turning a method ON needs at least one key — an empty developer app would be
  // enabled but unusable. Once on, either field can be saved by itself.
  const canSave = isEnabled
    ? changed
    : appId.trim().length > 0 || appSecret.trim().length > 0;
  // REPLACING a working developer app invalidates every account authorized
  // against the old one, so it gets a confirm. Filling in keys that were never
  // there (a method sitting in the half-configured state) breaks nothing and
  // saves straight through.
  const replacesLiveApp = isEnabled && credentialComplete(status) && changed;

  return (
    <>
      <ModalBody className="flex flex-col gap-4">
        {/* Only when this screen IS the whole sheet. Nested, the status belongs
            to the roster behind it — repeating it here describes the platform
            while you're looking at one method's keys, and a chevron above the
            heading duplicates the Cancel that already leads the footer. */}
        {standalone ? <StatusBand state={state} /> : null}

        {/* No section label — the fields name themselves, and the modal title
            plus the row you came from already say which method this is. */}
        {isEnabled && !editing ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <EditIcon />
              {t("common.edit")}
            </Button>
          </div>
        ) : null}

        {editing ? (
          <>
            <Field>
              <FieldLabel htmlFor={appIdId}>
                {t("onboarding.keys.appIdLabel")}
              </FieldLabel>
              <Input
                id={appIdId}
                name={appIdId}
                value={appId}
                onChange={(event) => setAppId(event.target.value)}
                placeholder={t("onboarding.keys.appIdPlaceholder")}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-1p-ignore=""
                data-lpignore="true"
                data-form-type="other"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={appSecretId}>
                {t("onboarding.keys.appSecretLabel")}
              </FieldLabel>
              <InputSecret
                id={appSecretId}
                name={appSecretId}
                value={appSecret}
                onChange={(event) => setAppSecret(event.target.value)}
                placeholder={t("onboarding.keys.appSecretPlaceholder")}
                revealLabel={t("projectSettings.platforms.revealSecret")}
                hideLabel={t("projectSettings.platforms.hideSecret")}
              />
            </Field>
          </>
        ) : (
          <dl className="flex flex-col gap-3">
            <MaskedKey
              label={t("projectSettings.platforms.appIdLabel")}
              present={Boolean(status?.hasAppId)}
            />
            <MaskedKey
              label={t("projectSettings.platforms.appSecretLabel")}
              present={Boolean(status?.hasAppSecret)}
            />
          </dl>
        )}
      </ModalBody>

      <ModalFooter className="sm:items-center">
        <div className="flex items-center gap-2 sm:me-auto">
          {standalone ? null : (
            <Button type="button" variant="ghost" onClick={pop}>
              {t("common.cancel")}
            </Button>
          )}
          {isEnabled ? (
            <MethodDisableConfirm
              brand={brand}
              variant={variant}
              isOnlyEnabled={isOnlyEnabled}
              collectsKeys
              pending={pending}
              resetKey={savedRevision}
              onDisable={onDisable}
            />
          ) : null}
        </div>
        {editing ? (
          replacesLiveApp ? (
            <ConfirmDialog
              key={savedRevision}
              trigger={
                <Button type="button" disabled={!canSave || pending || loading}>
                  {pending ? <Spinner /> : null}
                  {t("projectSettings.save")}
                </Button>
              }
              title={t("projectSettings.platforms.credentialsChangeTitle", {
                method: variant.optionLabel,
              })}
              description={t("projectSettings.platforms.credentialsChangeBody")}
              confirmLabel={t(
                "projectSettings.platforms.credentialsChangeConfirm",
              )}
              destructive
              pending={pending}
              onConfirm={() => onSave(appId, appSecret)}
            />
          ) : (
            <Button
              type="button"
              onClick={() => onSave(appId, appSecret)}
              disabled={!canSave || pending || loading}
            >
              {pending ? <Spinner /> : null}
              {t(
                isEnabled
                  ? "projectSettings.save"
                  : "projectSettings.platforms.enable",
              )}
            </Button>
          )
        ) : null}
      </ModalFooter>
    </>
  );
}

/** Disable as a plain footer button (the developer-app screen has no overflow
 * menu to hang it off). */
function MethodDisableConfirm({
  brand,
  variant,
  isOnlyEnabled,
  collectsKeys,
  pending,
  resetKey,
  onDisable,
}: {
  brand: BrandMeta;
  /** Drives whether the confirm mentions removing developer keys — it must not
   * on a Quickstart project, whose keys are Post for Me's, not the member's. */
  collectsKeys: boolean;
  isOnlyEnabled: boolean;
  onDisable: () => void;
  pending: boolean;
  resetKey: number;
  variant: BrandVariant;
}) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      key={resetKey}
      trigger={
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={pending}
        >
          {t("projectSettings.platforms.disableMethod")}
        </Button>
      }
      {...disableConfirmProps(t, brand, variant, isOnlyEnabled, collectsKeys)}
      pending={pending}
      onConfirm={onDisable}
    />
  );
}

/** A stored key, shown as dots. The component never receives the value at all —
 * only whether the server says one is stored. */
function MaskedKey({ label, present }: { label: string; present: boolean }) {
  const { t } = useTranslation();
  const set = present;
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-sm",
          set
            ? "font-mono tracking-widest text-foreground"
            : "text-warning-foreground",
        )}
      >
        {set ? "••••••••••••" : t("projectSettings.platforms.notAdded")}
      </dd>
    </div>
  );
}

/**
 * "Which should I use?" — the educational moment, living in the modal footer
 * beside the actions (the same placement the connect-account modal uses for its
 * hint). The rows name the methods; this states which one we'd pick and why,
 * which is what actually moves people to the Business API / Instagram Login.
 *
 * Renders nothing for a brand with a single connection method — there's no
 * choice to advise on.
 */
function VariantRecommendation({ brand }: { brand: BrandMeta }) {
  const { t } = useTranslation();
  if (!brand.recommendationKey) return null;

  // One titled block per method — the same `returnObjects` shape the
  // connect-account modal's hint uses, so the guidance breaks out into "start
  // here" and "add this if…" instead of one dense paragraph.
  const blocks = t(brand.recommendationKey, { returnObjects: true }) as Array<{
    body: string;
    title: string;
  }>;

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          // A 16px glyph beside 12px text reads top-heavy; the house pairing for
          // xs text is a 14px icon (see `ConnectMoreInfo` in the connect-account
          // modal). Scoped here rather than changed in `hintVariants`, which
          // would restyle the icon-only hint that modal already ships.
          <Hint size="sm" flush className="[&_[data-slot=hint-icon]]:size-3.5">
            <HintIcon />
            <HintText>{t("projectSettings.platforms.whichShouldIUse")}</HintText>
          </Hint>
        }
      />
      {/* Opens upward from the footer, anchored to the leading edge it sits on. */}
      <HoverCardContent side="top" align="start" className="w-88">
        <div className="flex flex-col gap-3">
          {blocks.map((block) => (
            <div key={block.title} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                {block.title}
              </span>
              <p className="text-xs/relaxed text-muted-foreground">
                {block.body}
              </p>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
