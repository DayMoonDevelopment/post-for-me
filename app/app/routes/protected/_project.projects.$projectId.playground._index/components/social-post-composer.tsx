import { format, isValid, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import {
  AccountSelector,
  AccountSelectorContent,
  AccountSelectorTrigger,
} from "~/components/account-selector";
import {
  CaptionComposer,
  CaptionComposerCount,
  CaptionComposerFooter,
  CaptionComposerInput,
  CaptionComposerPlatforms,
} from "~/components/caption-composer";
import {
  ConnectAccountModal,
  ConnectAccountModalTrigger,
} from "~/components/connect-account";
import { SocialPostConfiguration } from "~/components/social-post-configuration";
import { SocialPostMedia } from "~/components/social-post-media";
import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarIconBadge,
} from "~/components/user-avatar";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import {
  type SocialPostComposerMedia,
  useSocialPostComposerContext,
} from "~/hooks/use-social-post-composer";
import { AddIcon, CloseIcon, ScheduleIcon } from "~/icons";
import { validateSocialPost } from "~/lib/social-post-configuration.validation";
import { BrandMark } from "~/ui/brand-mark";
import { Button } from "~/ui/button";
import { ButtonGroup } from "~/ui/button-group";
import { Calendar } from "~/ui/calendar";
import { Input } from "~/ui/input";
import { Label } from "~/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/ui/popover";

/**
 * The Playground's composed Social Post Composer — the registry's
 * `@post-for-me/social-post-composer` block, re-composed against the registry's own
 * `useSocialPostComposer` provider (read via {@link useSocialPostComposerContext}) and wired
 * to a real `POST` action. Account cluster ▸ media ▸ caption ▸ per-platform config ▸ schedule.
 *
 * The registry hook is Zod-free, so we layer the full `validateSocialPostConfiguration` gate
 * on top of its `canPublish`. Media is app-specific: picked files preview via object URLs and
 * ride the multipart submit as `File`s; the action uploads them (upload-at-publish) then
 * creates the post.
 */
export function SocialPostComposer() {
  const { t } = useTranslation();
  const composer = useSocialPostComposerContext();
  const {
    accounts,
    setSocialAccounts,
    removeAccount,
    targetedAccounts,
    caption,
    setCaption,
    media,
    removeMedia,
    configuration,
    setConfiguration,
    platforms,
  } = composer;
  const socialAccounts = composer.value.socialAccounts;

  // FileList → media objects with object-URL previews; the file rides the multipart submit
  // and the action uploads it at publish time.
  const mediaCounter = useRef(0);
  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    composer.addMedia(
      Array.from(files).map<SocialPostComposerMedia>((file) => ({
        id: `local-${(mediaCounter.current += 1)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
      })),
    );
  };

  // Revoke outstanding object URLs on unmount.
  const mediaRef = useRef(media);
  mediaRef.current = media;
  useEffect(
    () => () => {
      for (const item of mediaRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );

  return (
    <div className="grid w-full max-w-2xl gap-5">
      <PostToField
        accounts={accounts}
        value={socialAccounts}
        onValueChange={setSocialAccounts}
        targeted={targetedAccounts}
        onRemove={removeAccount}
        label={t("playground.accountsLabel")}
        selectLabel={t("playground.selectAccounts")}
        removeLabel={(name) => t("playground.removeAccount", { name })}
        connectSlot={
          <ConnectAccountModal
            trigger={
              <ConnectAccountModalTrigger
                variant="ghost"
                size="sm"
                className="w-full justify-center text-primary hover:text-primary"
              >
                <AddIcon aria-hidden />
                {t("setup.connectAccount.trigger")}
              </ConnectAccountModalTrigger>
            }
          />
        }
      />

      <SocialPostMedia
        value={media}
        onAdd={addFiles}
        onRemove={removeMedia}
        onReorder={composer.setMedia}
        label={t("playground.mediaLabel")}
        addLabel={t("playground.addMedia")}
        emptyLabel={t("playground.mediaEmpty")}
        infoLabel={t("playground.mediaInfoLabel")}
        infoText={t("playground.mediaInfo")}
        removeLabel={(name) => t("playground.removeMedia", { name })}
      />

      <div className="grid gap-2">
        <Label>{t("playground.captionLabel")}</Label>
        <CaptionComposer
          value={caption}
          onValueChange={setCaption}
          platforms={platforms}
        >
          <CaptionComposerInput
            placeholder={t("playground.captionPlaceholder")}
          />
          <CaptionComposerFooter>
            <CaptionComposerCount />
            <CaptionComposerPlatforms />
          </CaptionComposerFooter>
        </CaptionComposer>
      </div>

      <div className="grid gap-2 border-t pt-4">
        <span className="text-sm font-medium">
          {t("playground.platformOptionsLabel")}
        </span>
        <SocialPostConfiguration
          accounts={targetedAccounts}
          value={configuration}
          onValueChange={setConfiguration}
        />
      </div>
    </div>
  );
}

/**
 * The publish actions for the composer — Save Draft and Post Now / Schedule Post. Rendered on
 * the trailing edge of the Playground's page header (see the route component), it reads the same
 * `SocialPostComposerProvider` context as {@link SocialPostComposer} and owns the publish
 * fetcher, so it must be mounted inside the provider alongside the composer.
 */
export function SocialPostComposerActions() {
  const { t } = useTranslation();
  const composer = useSocialPostComposerContext();
  const {
    targetedAccounts,
    caption,
    media,
    configuration,
    scheduledAt,
    setScheduledAt,
  } = composer;
  const socialAccounts = composer.value.socialAccounts;

  const fetcher = useFetcher();
  const pending = fetcher.state !== "idle";
  useActionErrorToast(fetcher);

  const [scheduleOpen, setScheduleOpen] = useState(false);

  // The registry hook's `canPublish` is required-fields-only (Zod-free); layer the full
  // whole-post validation on top for the real publish gate — future schedule, per-platform
  // media requirements, media tag rules, and the config refinements.
  const validation = useMemo(
    () =>
      validateSocialPost(
        { socialAccounts, caption, media, scheduledAt, configuration },
        { accounts: targetedAccounts },
      ),
    [
      socialAccounts,
      caption,
      media,
      scheduledAt,
      configuration,
      targetedAccounts,
    ],
  );
  const canPublish = composer.canPublish && validation.valid;

  const buildFormData = (isDraft: boolean) => {
    const formData = new FormData();
    formData.set("caption", caption);
    formData.set("social_accounts", JSON.stringify(socialAccounts));
    formData.set("configuration", JSON.stringify(configuration));
    formData.set("scheduled_at", scheduledAt ?? "");
    formData.set("is_draft", String(isDraft));
    for (const item of media) {
      if (item.file) formData.append("media", item.file, item.name);
    }
    return formData;
  };

  const publish = (isDraft: boolean) =>
    fetcher.submit(buildFormData(isDraft), {
      method: "post",
      encType: "multipart/form-data",
    });

  // `scheduled_at` is stored as an ISO string; the calendar/time inputs work in the
  // viewer's local timezone. Derive a local `Date` (and its `HH:mm`) from the draft.
  const scheduledDate = useMemo(() => {
    if (!scheduledAt) return undefined;
    const parsed = parseISO(scheduledAt);
    return isValid(parsed) ? parsed : undefined;
  }, [scheduledAt]);
  const timeValue = scheduledDate ? format(scheduledDate, "HH:mm") : "";

  // Disable past days in the calendar. Computed once; only read inside the (client-only)
  // popover, so `new Date()` here can't cause a hydration mismatch.
  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);

  const applyDateTime = (day: Date, hours: number, minutes: number) => {
    const next = new Date(day);
    next.setHours(hours, minutes, 0, 0);
    setScheduledAt(next.toISOString());
  };

  const handleSelectDate = (day: Date | undefined) => {
    if (!day) {
      setScheduledAt(null);
      return;
    }
    // Preserve the already-chosen time, else default to 9:00 AM.
    applyDateTime(
      day,
      scheduledDate?.getHours() ?? 9,
      scheduledDate?.getMinutes() ?? 0,
    );
  };

  const handleTimeChange = (value: string) => {
    if (!value) return;
    const [hours, minutes] = value.split(":").map(Number);
    // Anchor the time to the chosen day, or today if none is picked yet.
    applyDateTime(scheduledDate ?? new Date(), hours, minutes);
  };

  const clearSchedule = () => {
    setScheduledAt(null);
    setScheduleOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => publish(true)}
        disabled={!canPublish || pending}
      >
        {t("playground.saveDraft")}
      </Button>

      {/* Split publish button: primary posts/schedules; the calendar affordance opens a
          popover to pick a date + time (or clear back to "Post now"). */}
      <ButtonGroup>
        <Button
          onClick={() => publish(false)}
          disabled={!canPublish || pending}
        >
          {scheduledAt ? t("playground.schedulePost") : t("playground.postNow")}
        </Button>
        <Popover open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <PopoverTrigger
            render={
              <Button
                size="icon"
                aria-label={t("playground.scheduleTitle")}
                disabled={pending}
              />
            }
          >
            <ScheduleIcon aria-hidden />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-auto max-w-[calc(100vw-2rem)] gap-0 p-0"
          >
            <Calendar
              mode="single"
              selected={scheduledDate}
              onSelect={handleSelectDate}
              disabled={{ before: today }}
              className="p-3"
            />
            <div className="flex items-center justify-between gap-3 border-t p-3">
              <Label
                htmlFor="playground-schedule-time"
                className="text-xs font-medium"
              >
                {t("playground.scheduleTimeLabel")}
              </Label>
              <Input
                id="playground-schedule-time"
                type="time"
                className="w-fit"
                value={timeValue}
                onChange={(event) => handleTimeChange(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSchedule}
                disabled={!scheduledAt}
              >
                {t("playground.scheduleClear")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setScheduleOpen(false)}
              >
                {t("common.done")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </ButtonGroup>
    </div>
  );
}

/** Account picker with an inline avatar cluster (the registry block's signature trigger). */
function PostToField({
  accounts,
  value,
  onValueChange,
  targeted,
  onRemove,
  label,
  selectLabel,
  removeLabel,
  connectSlot,
}: {
  accounts: React.ComponentProps<typeof AccountSelector>["accounts"];
  connectSlot: React.ReactNode;
  label: string;
  onRemove: (id: string) => void;
  onValueChange: (ids: string[]) => void;
  removeLabel: (name: string) => string;
  selectLabel: string;
  targeted: typeof accounts;
  value: string[];
}) {
  return (
    <AccountSelector
      accounts={accounts}
      value={value}
      onValueChange={onValueChange}
    >
      <div className="grid gap-3">
        {/* "Post to" label and the selection action share a row; the action stays
            put whether or not accounts are selected, so it never jumps around. */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <AccountSelectorTrigger render={<Button variant="outline" size="sm" />}>
            <AddIcon aria-hidden />
            {selectLabel}
          </AccountSelectorTrigger>
        </div>

        {/* Avatars spread and wrap underneath (no hover-collapse), so the remove
            control is reachable on touch and many accounts flow to more rows. */}
        {targeted.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            {targeted.map((account) => {
              const name = account.displayName ?? account.username;
              return (
                <div key={account.id} className="relative">
                  <UserAvatar
                    name={name}
                    src={account.avatarUrl}
                    size="lg"
                    className="ring-2 ring-background"
                  >
                    <UserAvatarBadge>
                      <UserAvatarIconBadge>
                        <BrandMark platform={account.platform} />
                      </UserAvatarIconBadge>
                    </UserAvatarBadge>
                    <UserAvatarBadge placement="secondary">
                      <button
                        type="button"
                        onClick={() => onRemove(account.id)}
                        aria-label={removeLabel(name)}
                        className="inline-flex size-5 items-center justify-center rounded-full border border-muted-foreground/40 bg-background text-foreground transition-colors hover:bg-muted [&_svg]:size-3"
                      >
                        <CloseIcon aria-hidden />
                      </button>
                    </UserAvatarBadge>
                  </UserAvatar>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <AccountSelectorContent footer={connectSlot} />
    </AccountSelector>
  );
}
