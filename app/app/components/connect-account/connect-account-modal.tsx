import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useLocation, useParams } from "react-router";

import type { SetupActionDialogProps } from "~/components/setup-action-dialog";
import type { SocialProvider } from "~/lib/post-for-me.types";

import {
  CodePanel,
  CodeShowcase,
  CodeShowcaseAside,
  CodeShowcaseMain,
} from "~/components/code-panel";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
  ModalTrigger,
} from "~/components/modal";
import { InfoCircleIcon, SocialAccountsIcon } from "~/icons";
import { PLATFORM_LABELS } from "~/lib/post-for-me.utils";
import { cn } from "~/lib/utils";
import { BrandMark } from "~/ui/brand-mark";
import { Button } from "~/ui/button";
import { Checkbox } from "~/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "~/ui/field";
import { Hint, HintIcon } from "~/ui/hint";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/ui/hover-card";
import { Input } from "~/ui/input";
import { InputSecret } from "~/ui/input-secret";
import { RadioGroup, RadioGroupItem } from "~/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select";
import { Spinner } from "~/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

import {
  type ConnectFormValues,
  deriveConnectRequest,
  toAuthUrlConfig,
} from "./connect-account-request";
import { buildConnectSamples } from "./connect-account-snippets";

/**
 * `ConnectAccountModal` — the two-panel "connect a social account" experience.
 * The left column is the setup form (pick a platform, set the connection
 * options); the distinguished muted aside on the right mirrors those choices as
 * a live {@link CodePanel} of the `createAuthURL` call.
 *
 * SKELETON (PFM-696): the form drives the code sample and gates the Connect
 * button, but the footer action is still a placeholder — the real OAuth hand-off
 * (calling `socialAccounts.createAuthURL` and redirecting) wires in next.
 *
 * Shared state rides {@link ConnectAccountFormContext}; read it with
 * {@link useConnectAccountForm}.
 */

/**
 * How ready a platform is to connect, which drives whether it's selectable:
 * `ready` (credentials in place), `incomplete` (partially set up), or
 * `unconfigured` (no credentials). Only `ready` platforms are selectable.
 */
export type PlatformConnectStatus = "incomplete" | "ready" | "unconfigured";

/** Per-platform readiness, e.g. derived from the project's configured provider
 * credentials. Any platform absent from the map is treated as `unconfigured`. */
export type PlatformConnectStatusMap = Partial<
  Record<SocialProvider, PlatformConnectStatus>
>;

type Permission = "feeds" | "posts";
type InstagramConnection = "facebook" | "instagram";
type LinkedinConnection = "organization" | "personal";
type TiktokApi = "business" | "standard";
type XConnection = "oauth1" | "oauth2";

/**
 * The platforms as presented in the connect dropdown. Note TikTok is a SINGLE
 * entry here — the Standard/Business choice lives inside the form and picks the
 * underlying `tiktok` / `tiktok_business` provider.
 */
const CONNECT_PLATFORM_ORDER = [
  "instagram",
  "facebook",
  "x",
  "tiktok",
  "youtube",
  "linkedin",
  "threads",
  "pinterest",
  "bluesky",
] as const satisfies readonly SocialProvider[];

function connectPlatformLabel(provider: SocialProvider): string {
  // TikTok is unified in the connect UI; its two APIs are an in-form choice.
  return provider === "tiktok" ? "TikTok" : PLATFORM_LABELS[provider];
}

type ConnectAccountFormState = {
  blueskyAppPassword: string;
  blueskyHandle: string;
  externalId: string;
  getPlatformStatus: (provider: SocialProvider) => PlatformConnectStatus;
  instagramConnection: InstagramConnection;
  linkedinConnection: LinkedinConnection;
  permissions: Record<Permission, boolean>;
  platform: SocialProvider;
  setBlueskyAppPassword: (value: string) => void;
  setBlueskyHandle: (value: string) => void;
  setExternalId: (value: string) => void;
  setInstagramConnection: (value: InstagramConnection) => void;
  setLinkedinConnection: (value: LinkedinConnection) => void;
  setPermission: (key: Permission, value: boolean) => void;
  setPlatform: (value: SocialProvider) => void;
  setTiktokApi: (value: TiktokApi) => void;
  setXConnection: (value: XConnection) => void;
  tiktokApi: TiktokApi;
  xConnection: XConnection;
};

const ConnectAccountFormContext =
  React.createContext<ConnectAccountFormState | null>(null);

/** Read the connect-account form state. Throws outside {@link ConnectAccountModal}. */
export function useConnectAccountForm(): ConnectAccountFormState {
  const context = React.useContext(ConnectAccountFormContext);
  if (!context) {
    throw new Error(
      "useConnectAccountForm must be used within <ConnectAccountModal>",
    );
  }
  return context;
}

export function ConnectAccountModal({
  open,
  onOpenChange,
  defaultOpen,
  trigger,
  platforms,
}: SetupActionDialogProps & {
  /** Per-platform readiness. Omit to leave every platform selectable; pass a map
   * (from the project's configured credentials) to disable the ones that aren't
   * `ready`. Anything absent from the map reads as `unconfigured`. */
  platforms?: PlatformConnectStatusMap;
}) {
  const { t } = useTranslation();
  // `projectId` scopes the server redirect route; present on the real project
  // pages, absent in the dev showcase (where Connect stays an inert placeholder).
  const { projectId } = useParams();
  const location = useLocation();
  const fetcher = useFetcher();
  const connecting = fetcher.state !== "idle";

  const getPlatformStatus = React.useCallback(
    (provider: SocialProvider): PlatformConnectStatus =>
      platforms ? (platforms[provider] ?? "unconfigured") : "ready",
    [platforms],
  );

  const [platform, setPlatform] = React.useState<SocialProvider>(
    () =>
      CONNECT_PLATFORM_ORDER.find((p) => getPlatformStatus(p) === "ready") ??
      CONNECT_PLATFORM_ORDER[0],
  );

  // Snap to the first ready platform if the selected one is no longer ready.
  React.useEffect(() => {
    if (getPlatformStatus(platform) !== "ready") {
      const ready = CONNECT_PLATFORM_ORDER.find(
        (p) => getPlatformStatus(p) === "ready",
      );
      if (ready) setPlatform(ready);
    }
  }, [getPlatformStatus, platform]);

  const [permissions, setPermissions] = React.useState<
    Record<Permission, boolean>
  >({ posts: true, feeds: true });
  const setPermission = React.useCallback(
    (key: Permission, value: boolean) =>
      setPermissions((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const [externalId, setExternalId] = React.useState("");
  const [instagramConnection, setInstagramConnection] =
    React.useState<InstagramConnection>("instagram");
  const [linkedinConnection, setLinkedinConnection] =
    React.useState<LinkedinConnection>("organization");
  const [tiktokApi, setTiktokApi] = React.useState<TiktokApi>("business");
  const [xConnection, setXConnection] = React.useState<XConnection>("oauth2");
  const [blueskyHandle, setBlueskyHandle] = React.useState("");
  const [blueskyAppPassword, setBlueskyAppPassword] = React.useState("");

  const value: ConnectAccountFormState = {
    platform,
    setPlatform,
    getPlatformStatus,
    permissions,
    setPermission,
    externalId,
    setExternalId,
    instagramConnection,
    setInstagramConnection,
    linkedinConnection,
    setLinkedinConnection,
    tiktokApi,
    setTiktokApi,
    xConnection,
    setXConnection,
    blueskyHandle,
    setBlueskyHandle,
    blueskyAppPassword,
    setBlueskyAppPassword,
  };

  // Gate Connect: Bluesky needs credentials; everyone else needs ≥1 permission.
  const canConnect =
    platform === "bluesky"
      ? blueskyHandle.trim().length > 0 && blueskyAppPassword.trim().length > 0
      : permissions.posts || permissions.feeds;

  // The exact createAuthURL request the code panel renders — POSTed verbatim to
  // the redirect route, so the connection uses precisely what the user sees.
  const request = deriveConnectRequest(value);
  const authConfig = JSON.stringify(toAuthUrlConfig(request));

  return (
    <Modal open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
      {trigger}
      <ModalContent
        layout="framed"
        data-slot="connect-account-modal"
        className="sm:max-w-5xl"
      >
        <ConnectAccountFormContext.Provider value={value}>
          <CodeShowcase>
            <CodeShowcaseMain className="flex flex-col gap-6">
              <ConnectAccountSetup />
            </CodeShowcaseMain>
            <CodeShowcaseAside>
              <ConnectAccountCode />
            </CodeShowcaseAside>
          </CodeShowcase>
          <ModalFooter>
            {/* Hint pinned to the footer's leading edge; opens upward since the
                footer sits at the bottom of the modal. */}
            <HoverCard>
              <HoverCardTrigger
                render={
                  <Hint size="sm" flush className="sm:me-auto">
                    <HintIcon />
                  </Hint>
                }
              />
              <HoverCardContent side="top" align="start" className="w-80">
                <div className="flex flex-col gap-2">
                  {(
                    t("setup.connectAccount.modal.hint.paragraphs", {
                      returnObjects: true,
                    }) as string[]
                  ).map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-xs/relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                  <a
                    href="https://ui.postforme.dev/docs/social-account-connection"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {t("setup.connectAccount.modal.hint.link")}
                  </a>
                </div>
              </HoverCardContent>
            </HoverCard>
            <ModalClose render={<Button variant="ghost" />}>
              {t("common.cancel")}
            </ModalClose>
            {/* The OAuth hand-off: POST the chosen config to the redirect route,
                which mints the auth URL server-side and 302s to the provider.
                `display: contents` lets the button stay a direct footer flex item.
                Without a projectId (the dev showcase) Connect is an inert close. */}
            {projectId ? (
              <fetcher.Form
                method="post"
                action={`/redirect/projects/${projectId}/connect-account`}
                className="contents"
              >
                <input type="hidden" name="platform" value={request.platform} />
                {request.externalId ? (
                  <input
                    type="hidden"
                    name="external_id"
                    value={request.externalId}
                  />
                ) : null}
                <input type="hidden" name="config" value={authConfig} />
                <input
                  type="hidden"
                  name="return_to"
                  value={location.pathname + location.search}
                />
                <Button type="submit" disabled={!canConnect || connecting}>
                  {connecting ? <Spinner /> : null}
                  {t("setup.connectAccount.modal.connect")}
                </Button>
              </fetcher.Form>
            ) : (
              <ModalClose render={<Button disabled={!canConnect} />}>
                {t("setup.connectAccount.modal.connect")}
              </ModalClose>
            )}
          </ModalFooter>
        </ConnectAccountFormContext.Provider>
      </ModalContent>
    </Modal>
  );
}

/** Left column: header, platform picker, the platform-specific connection block,
 * permissions (hidden for Bluesky), and the demoted External ID. */
function ConnectAccountSetup() {
  const { t } = useTranslation();
  const { platform, setPlatform, getPlatformStatus } = useConnectAccountForm();

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Non-interactive accent badge — mirrors SetupScreenHeader's treatment. */}
        <span className="flex size-10 items-center justify-center rounded-lg bg-pop/10 text-pop [&_svg]:size-5">
          <SocialAccountsIcon />
        </span>
        <div className="flex flex-col gap-1.5">
          <ModalTitle className="font-heading text-xl font-semibold text-foreground">
            {t("setup.connectAccount.modal.title")}
          </ModalTitle>
          <p className="text-sm/normal text-muted-foreground">
            {t("setup.connectAccount.modal.description")}
          </p>
        </div>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel id="connect-platform-label">
            {t("setup.connectAccount.modal.platformLabel")}
          </FieldLabel>
          <Select
            value={platform}
            onValueChange={(next) => setPlatform(next as SocialProvider)}
          >
            <SelectTrigger
              aria-labelledby="connect-platform-label"
              className="h-9 w-full"
            >
              <SelectValue>
                {(selected) => (
                  <>
                    <BrandMark
                      platform={selected as SocialProvider}
                      className="size-4"
                    />
                    {connectPlatformLabel(selected as SocialProvider)}
                  </>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CONNECT_PLATFORM_ORDER.map((provider) => {
                const status = getPlatformStatus(provider);
                const disabled = status !== "ready";
                return (
                  <SelectItem
                    key={provider}
                    value={provider}
                    disabled={disabled}
                  >
                    <BrandMark platform={provider} className="size-4" />
                    <span className="flex-1">
                      {connectPlatformLabel(provider)}
                    </span>
                    {disabled ? (
                      <span className="text-[0.6875rem] text-muted-foreground">
                        {t(
                          `setup.connectAccount.modal.platformStatus.${status}`,
                        )}
                      </span>
                    ) : null}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </Field>

        <ConnectPlatformOptions />

        {platform === "bluesky" ? null : <ConnectPermissions />}

        <ConnectExternalId />
      </FieldGroup>
    </>
  );
}

/** The platform-specific connection control(s). Nothing for the plain OAuth
 * platforms (Facebook / YouTube / Threads / Pinterest). */
function ConnectPlatformOptions() {
  const { t } = useTranslation();
  const {
    platform,
    instagramConnection,
    setInstagramConnection,
    linkedinConnection,
    setLinkedinConnection,
    tiktokApi,
    setTiktokApi,
    xConnection,
    setXConnection,
  } = useConnectAccountForm();

  switch (platform) {
    case "instagram":
      return (
        <ConnectRadioField
          label={t("setup.connectAccount.modal.instagram.label")}
          // Contextual: describe what the SELECTED method actually does.
          description={t(
            `setup.connectAccount.modal.instagram.description.${instagramConnection}`,
          )}
          value={instagramConnection}
          onChange={setInstagramConnection}
          options={[
            {
              value: "instagram",
              label: t("setup.connectAccount.modal.instagram.options.instagram"),
            },
            {
              value: "facebook",
              label: t("setup.connectAccount.modal.instagram.options.facebook"),
            },
          ]}
        />
      );
    case "linkedin":
      return (
        <ConnectRadioField
          label={t("setup.connectAccount.modal.linkedin.label")}
          hint={t("setup.connectAccount.modal.linkedin.education")}
          value={linkedinConnection}
          onChange={setLinkedinConnection}
          options={[
            {
              value: "organization",
              label: t(
                "setup.connectAccount.modal.linkedin.options.organization",
              ),
            },
            {
              value: "personal",
              label: t("setup.connectAccount.modal.linkedin.options.personal"),
            },
          ]}
        />
      );
    case "tiktok":
      return (
        <ConnectRadioField
          label={t("setup.connectAccount.modal.tiktok.label")}
          hint={t("setup.connectAccount.modal.tiktok.education")}
          value={tiktokApi}
          onChange={setTiktokApi}
          options={[
            {
              value: "business",
              label: t("setup.connectAccount.modal.tiktok.options.business"),
            },
            {
              value: "standard",
              label: t("setup.connectAccount.modal.tiktok.options.standard"),
            },
          ]}
        />
      );
    case "x":
      return (
        <ConnectRadioField
          label={t("setup.connectAccount.modal.x.label")}
          hint={t("setup.connectAccount.modal.x.education")}
          value={xConnection}
          onChange={setXConnection}
          options={[
            {
              value: "oauth2",
              label: t("setup.connectAccount.modal.x.options.oauth2"),
            },
            {
              value: "oauth1",
              label: t("setup.connectAccount.modal.x.options.oauth1"),
            },
          ]}
        />
      );
    case "bluesky":
      return <ConnectBlueskyFields />;
    default:
      return null;
  }
}

/** A single-select connection choice as a 2-column radio (choice cards). Detail
 * lives in an on-demand `hint` tooltip on the label; a short contextual
 * `description` (changes with selection) can sit below. */
function ConnectRadioField<T extends string>({
  label,
  value,
  onChange,
  options,
  description,
  hint,
}: {
  description?: React.ReactNode;
  hint?: React.ReactNode;
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  const legendId = React.useId();

  return (
    <FieldSet>
      <FieldLegend variant="label" id={legendId}>
        {label}
      </FieldLegend>
      <RadioGroup
        aria-labelledby={legendId}
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className="grid grid-cols-2 gap-2"
      >
        {options.map((option) => {
          const id = `${legendId}-${option.value}`;
          return (
            <FieldLabel key={option.value} htmlFor={id}>
              <Field orientation="horizontal">
                <FieldTitle>{option.label}</FieldTitle>
                <RadioGroupItem value={option.value} id={id} />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {hint ? <ConnectMoreInfo>{hint}</ConnectMoreInfo> : null}
    </FieldSet>
  );
}

/** Bluesky connects with credentials (no OAuth redirect). */
function ConnectBlueskyFields() {
  const { t } = useTranslation();
  const {
    blueskyHandle,
    setBlueskyHandle,
    blueskyAppPassword,
    setBlueskyAppPassword,
  } = useConnectAccountForm();

  return (
    <>
      <Field>
        <FieldLabel htmlFor="connect-bluesky-handle">
          {t("setup.connectAccount.modal.bluesky.handle.label")}
        </FieldLabel>
        <Input
          id="connect-bluesky-handle"
          value={blueskyHandle}
          onChange={(event) => setBlueskyHandle(event.target.value)}
          placeholder={t("setup.connectAccount.modal.bluesky.handle.placeholder")}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="connect-bluesky-password">
          {t("setup.connectAccount.modal.bluesky.appPassword.label")}
        </FieldLabel>
        <InputSecret
          id="connect-bluesky-password"
          value={blueskyAppPassword}
          onChange={(event) => setBlueskyAppPassword(event.target.value)}
          placeholder={t(
            "setup.connectAccount.modal.bluesky.appPassword.placeholder",
          )}
        />
        <ConnectMoreInfo>
          {t("setup.connectAccount.modal.bluesky.education")}
        </ConnectMoreInfo>
      </Field>
    </>
  );
}

/** Universal Permissions: Posting + Feeds, both on by default, ≥1 required. */
function ConnectPermissions() {
  const { t } = useTranslation();
  const { permissions, setPermission } = useConnectAccountForm();
  const none = !permissions.posts && !permissions.feeds;

  const items: Permission[] = ["posts", "feeds"];

  return (
    <FieldSet className="gap-2.5">
      <FieldLegend variant="label">
        {t("setup.connectAccount.modal.permissions.label")}
      </FieldLegend>
      {items.map((key) => {
        const id = `connect-permission-${key}`;
        return (
          <Field key={key} orientation="horizontal">
            <Checkbox
              id={id}
              checked={permissions[key]}
              onCheckedChange={(checked) => setPermission(key, checked === true)}
            />
            <FieldContent>
              <FieldLabel htmlFor={id} className="font-normal">
                {t(`setup.connectAccount.modal.permissions.${key}.label`)}
              </FieldLabel>
              <FieldDescription>
                {t(`setup.connectAccount.modal.permissions.${key}.help`)}
              </FieldDescription>
            </FieldContent>
          </Field>
        );
      })}
      {none ? (
        <FieldError>
          {t("setup.connectAccount.modal.permissions.required")}
        </FieldError>
      ) : null}
    </FieldSet>
  );
}

/** External ID — optional, demoted to the bottom of the form. */
function ConnectExternalId() {
  const { t } = useTranslation();
  const { externalId, setExternalId } = useConnectAccountForm();

  return (
    <Field>
      <FieldLabel htmlFor="connect-external-id">
        {t("setup.connectAccount.modal.externalId.label")}{" "}
        <span className="font-normal text-muted-foreground">
          ({t("setup.connectAccount.modal.optional")})
        </span>
      </FieldLabel>
      <Input
        id="connect-external-id"
        value={externalId}
        onChange={(event) => setExternalId(event.target.value)}
        placeholder={t("setup.connectAccount.modal.externalId.placeholder")}
        autoComplete="off"
        spellCheck={false}
      />
      <ConnectMoreInfo>
        {t("setup.connectAccount.modal.externalId.help")}
      </ConnectMoreInfo>
    </Field>
  );
}

/** An explicit "More info" affordance that reveals detail in a tooltip — chosen
 * over a bare icon for discoverability (clarity over subtlety). The wrapper keeps
 * the trigger `w-fit` (a vertical Field/FieldSet stretches direct children to
 * full width, which would balloon the hover target and mis-anchor the tooltip). */
function ConnectMoreInfo({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex", className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            />
          }
        >
          <InfoCircleIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="underline decoration-muted-foreground/40 decoration-dotted underline-offset-2">
            {t("setup.connectAccount.modal.moreInfo")}
          </span>
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Right aside: the live `createAuthURL` samples mirroring the setup form. */
function ConnectAccountCode() {
  const {
    platform,
    permissions,
    externalId,
    instagramConnection,
    linkedinConnection,
    tiktokApi,
    xConnection,
    blueskyHandle,
    blueskyAppPassword,
  } = useConnectAccountForm();

  // Same derivation the real submit uses (with illustrative Bluesky placeholders
  // so the sample always reads plausibly) — the code panel IS the request.
  const samples = React.useMemo(() => {
    const values: ConnectFormValues = {
      platform,
      permissions,
      externalId,
      instagramConnection,
      linkedinConnection,
      tiktokApi,
      xConnection,
      blueskyHandle,
      blueskyAppPassword,
    };
    return buildConnectSamples(
      deriveConnectRequest(values, { placeholders: true }),
    );
  }, [
    platform,
    permissions,
    externalId,
    instagramConnection,
    linkedinConnection,
    tiktokApi,
    xConnection,
    blueskyHandle,
    blueskyAppPassword,
  ]);

  return (
    <CodePanel
      samples={samples}
      className="min-h-0 flex-1"
      // Clear the dialog's absolute top-end close button.
      headerClassName="pe-10"
    />
  );
}

/**
 * The default trigger presentation for the connect-account modal. Render through
 * `trigger`:
 *
 *   <ConnectAccountModal trigger={<ConnectAccountModalTrigger />} />
 */
export function ConnectAccountModalTrigger({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { t } = useTranslation();
  return (
    <ModalTrigger render={<Button {...props} />}>
      {children ?? t("setup.connectAccount.trigger")}
    </ModalTrigger>
  );
}
