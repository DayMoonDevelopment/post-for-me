"use client";

import { format, isValid, parseISO } from "date-fns";
import { useRef } from "react";

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
import { PlatformAvatar } from "~/components/platform-avatar";
import { SocialPostConfiguration } from "~/components/social-post-configuration";
import { SocialPostMedia } from "~/components/social-post-media";
import { UserAvatar, UserAvatarBadge } from "~/components/user-avatar";
import { useHydrated } from "~/hooks/use-hydrated";
import {
  useSocialPostComposer,
  type SocialPostComposerMedia,
} from "~/hooks/use-social-post-composer";
import type { SocialAccount } from "~/lib/post-for-me.types";
import { Button } from "~/ui/button";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import { Input } from "~/ui/input";
import { Label } from "~/ui/label";

// Sample connected accounts — replace with `client.socialAccounts.list()`.
const ACCOUNTS: SocialAccount[] = [
  { id: "ig-acme", platform: "instagram", username: "acme", displayName: "Acme" },
  { id: "ig-shop", platform: "instagram", username: "acme.shop", displayName: "Acme Shop" },
  { id: "tt-acme", platform: "tiktok", username: "acme", displayName: "Acme" },
  { id: "pin-acme", platform: "pinterest", username: "acme", displayName: "Acme" },
];

// A <datetime-local> wants a local "yyyy-MM-dd'T'HH:mm" string; the draft stores UTC ISO.
// `date-fns` format() renders in the visitor's timezone, which the SERVER can't know — so the
// caller only uses this after hydration (see `useHydrated` below) to avoid a mismatch.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = parseISO(iso);
  return isValid(date) ? format(date, "yyyy-MM-dd'T'HH:mm") : "";
}

/**
 * The complete social post composer we run in the dashboard. Pick accounts (an inline avatar
 * cluster), attach media, write a caption within each targeted platform's limit, tune
 * per-platform options via <SocialPostConfiguration>, and optionally schedule — all sharing
 * one draft via {@link useSocialPostComposer}. `canPublish` gates the actions, and
 * `toCreatePost()` assembles the create-post body.
 *
 * Media follows Post for Me's **upload-at-publish** model: picked files are previewed locally
 * and only uploaded when you post (see {@link publish}), so swapping a file before posting
 * never wastes an upload.
 */
export function SocialPostComposer() {
  const composer = useSocialPostComposer({
    accounts: ACCOUNTS,
    defaultValue: {
      socialAccounts: ACCOUNTS.map((account) => account.id),
      caption: "Big news — our summer sale is live ☀️",
      // Sample media are already hosted (they carry a `url`); user picks below stay local
      // until publish.
      media: [
        { id: "m1", name: "summer-hero.jpg", url: "https://picsum.photos/seed/acme-hero/480/480" },
        { id: "m2", name: "promo-reel.mp4", url: "https://picsum.photos/seed/acme-reel/480/480" },
        { id: "m3", name: "product-flatlay.jpg", url: "https://picsum.photos/seed/acme-flatlay/480/480" },
        { id: "m4", name: "unboxing.mov", url: "https://picsum.photos/seed/acme-unboxing/480/480" },
        { id: "m5", name: "lifestyle-01.jpg", url: "https://picsum.photos/seed/acme-life/480/480" },
        { id: "m6", name: "teaser.mp4", url: "https://picsum.photos/seed/acme-teaser/480/480" },
        { id: "m7", name: "detail-shot.jpg", url: "https://picsum.photos/seed/acme-detail/480/480" },
        { id: "m8", name: "behind-scenes.mov", url: "https://picsum.photos/seed/acme-bts/480/480" },
      ],
      configuration: {},
      scheduledAt: null,
      isDraft: false,
    },
  });

  // The schedule field shows a LOCAL time; the server can't know the visitor's timezone, so we
  // render it empty until hydrated, then fill in the real local value (no hydration mismatch).
  const hydrated = useHydrated();
  const mediaCounter = useRef(0);

  // Preview picked files locally — object URLs render immediately; the file rides along until
  // publish, when it's uploaded.
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

  const publish = async (isDraft: boolean) => {
    composer.setIsDraft(isDraft);
    // Upload-at-publish: upload each still-local file, then post with the resolved urls.
    //
    // const uploaded = await Promise.all(
    //   composer.pendingMedia.map(async (item) => {
    //     const { upload_url, media_url } = await client.media.createUploadURL();
    //     await fetch(upload_url, { method: "PUT", body: item.file });
    //     return [item.id, media_url] as const;
    //   }),
    // );
    // const mediaUrls = Object.fromEntries(uploaded);
    // await client.socialPosts.create(composer.toCreatePost({ mediaUrls }));
  };

  return (
    <div className="grid w-full max-w-xl gap-5">
      {/* Action bar: schedule + publish, one row at the top. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="composer-schedule" className="whitespace-nowrap">
            Schedule
          </Label>
          <Input
            id="composer-schedule"
            type="datetime-local"
            className="w-fit"
            value={hydrated ? toLocalInput(composer.scheduledAt) : ""}
            onChange={(event) =>
              composer.setScheduledAt(
                event.target.value
                  ? new Date(event.target.value).toISOString()
                  : null,
              )
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => publish(true)}
            disabled={!composer.canPublish}
          >
            Save draft
          </Button>
          <Button onClick={() => publish(false)} disabled={!composer.canPublish}>
            {composer.scheduledAt ? "Schedule post" : "Post now"}
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Post to</span>
        <AccountSelector
          accounts={ACCOUNTS}
          value={composer.value.socialAccounts}
          onValueChange={composer.setSocialAccounts}
        >
          <div className="flex w-full items-center">
            {composer.targetedAccounts.length === 0 ? (
              <AccountSelectorTrigger render={<Button variant="outline" />}>
                <IconPlaceholder
                  lucide="Plus"
                  tabler="IconPlus"
                  phosphor="Plus"
                  hugeicons="PlusSignIcon"
                  remixicon="RiAddLine"
                  aria-hidden
                />
                Select account
              </AccountSelectorTrigger>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <AccountSelectorTrigger
                  render={<Button variant="secondary" size="icon" className="size-11" />}
                >
                  <IconPlaceholder
                    lucide="Plus"
                    tabler="IconPlus"
                    phosphor="Plus"
                    hugeicons="PlusSignIcon"
                    remixicon="RiAddLine"
                    className="size-5"
                    aria-hidden
                  />
                  <span className="sr-only">Add account</span>
                </AccountSelectorTrigger>

                {/* Always-expanded: avatars spread and wrap (no hover-collapse), so the remove
                    control is reachable on touch and many accounts flow to a second row. */}
                {composer.targetedAccounts.map((account) => {
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
                          <PlatformAvatar platform={account.platform} className="size-5" />
                        </UserAvatarBadge>
                        <UserAvatarBadge placement="secondary">
                          <button
                            type="button"
                            onClick={() => composer.removeAccount(account.id)}
                            aria-label={`Remove ${name}`}
                            className="inline-flex size-5 items-center justify-center rounded-full border border-muted-foreground/40 bg-background text-foreground transition-colors hover:bg-muted [&_svg]:size-3"
                          >
                            <IconPlaceholder
                              lucide="X"
                              tabler="IconX"
                              phosphor="X"
                              hugeicons="Cancel01Icon"
                              remixicon="RiCloseLine"
                              aria-hidden
                            />
                          </button>
                        </UserAvatarBadge>
                      </UserAvatar>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <AccountSelectorContent />
        </AccountSelector>
      </div>

      <SocialPostMedia
        value={composer.media}
        onAdd={addFiles}
        onRemove={composer.removeMedia}
        onReorder={composer.setMedia}
        infoText="Images and videos, up to 200 MB each. JPG, PNG, GIF, WEBP, MP4, or MOV."
      />

      <CaptionComposer
        value={composer.caption}
        onValueChange={composer.setCaption}
        platforms={composer.platforms}
      >
        <CaptionComposerInput placeholder="Write a caption…" />
        <CaptionComposerFooter>
          <CaptionComposerCount />
          <CaptionComposerPlatforms />
        </CaptionComposerFooter>
      </CaptionComposer>

      <div className="grid gap-2 border-t pt-4">
        <span className="text-sm font-medium">Platform options</span>
        <SocialPostConfiguration
          accounts={composer.targetedAccounts}
          value={composer.configuration}
          onValueChange={composer.setConfiguration}
        />
      </div>

    </div>
  );
}
