"use client";

import type { ReactNode } from "react";

import { createContext, createElement, useContext, useMemo, useState } from "react";

import type { SocialAccount, SocialProvider } from "~/lib/post-for-me.types";
import type { SocialPostConfiguration } from "~/lib/social-post-configuration.types";

import {
  useSocialPostConfiguration,
  type UseSocialPostConfigurationReturn,
} from "~/hooks/use-social-post-configuration";

/**
 * A person/product tag positioned on a piece of media (Instagram / Facebook only).
 * Mirrors the API's media tag.
 */
export interface SocialPostComposerMediaTag {
  /** FB user id, IG username, or IG product id, per {@link type}. */
  id: string;
  platform: "facebook" | "instagram";
  /** `user` tags an account; `product` tags an IG shop product. */
  type: "product" | "user";
  /** Percentage from the left edge (0–100), images only. */
  x?: number;
  /** Percentage from the top edge (0–100), images only. */
  y?: number;
}

/**
 * One media attachment on the draft — a media OBJECT, not just a URL. Post for Me's
 * recommended flow is **upload-at-publish**: hold the picked `file` locally (previewed via a
 * local object URL), and only when the post is submitted, upload it (create-upload-url → PUT)
 * and set `url` to the returned media URL. This avoids paying egress for files the user
 * swaps out before posting. A consumer MAY instead upload on select and set `url` up front —
 * both are supported (an item is publishable once it has a `url`).
 *
 * The extra options mirror the API's per-media fields — set them alongside the file; they
 * survive to {@link SocialPostCreateBody} unchanged.
 */
export interface SocialPostComposerMedia {
  /** The picked file, pending upload. Present until it's uploaded (upload-at-publish). */
  file?: File;
  id: string;
  /** Optional display name (e.g. the file name). */
  name?: string;
  /** Preview source for the thumbnail — a local object URL, or the hosted URL. */
  previewUrl?: string;
  /** Post the media as-is without processing (best for large files). */
  skipProcessing?: boolean | null;
  /** People / product tags positioned on the media (IG + FB). */
  tags?: SocialPostComposerMediaTag[] | null;
  /** Millisecond timestamp of the video frame to use as a thumbnail. */
  thumbnailTimestampMs?: number | null;
  /** Public URL of a thumbnail for the media. */
  thumbnailUrl?: string | null;
  /** The hosted media URL — set after upload (or up front for already-hosted media). */
  url?: string;
}

/**
 * The whole social post being composed — everything `POST /v1/social-posts` needs. The
 * per-platform slice ({@link configuration}) is the same value the
 * `useSocialPostConfiguration` hook / `<SocialPostConfiguration>` component own, so it
 * round-trips with no adapter.
 */
export interface SocialPostComposerDraft {
  caption: string;
  configuration: SocialPostConfiguration;
  /** Create the post but don't process it (a saved draft). */
  isDraft: boolean;
  media: SocialPostComposerMedia[];
  /** ISO-8601 publish time, or `null` to publish immediately. */
  scheduledAt: string | null;
  socialAccounts: string[];
}

/** One media entry on the create-post body (API snake_case). */
export interface SocialPostCreateBodyMedia {
  skip_processing?: boolean | null;
  tags?: SocialPostComposerMediaTag[] | null;
  thumbnail_timestamp_ms?: number | null;
  thumbnail_url?: string | null;
  url: string;
}

/** The create-post request body this draft assembles (API snake_case). */
export interface SocialPostCreateBody {
  account_configurations?: SocialPostConfiguration["account_configurations"];
  caption: string;
  isDraft?: boolean;
  media?: SocialPostCreateBodyMedia[];
  platform_configurations?: SocialPostConfiguration["platform_configurations"];
  scheduled_at?: string | null;
  social_accounts: string[];
}

const EMPTY_DRAFT: SocialPostComposerDraft = {
  socialAccounts: [],
  caption: "",
  media: [],
  configuration: {},
  scheduledAt: null,
  isDraft: false,
};

export interface UseSocialPostComposerOptions {
  /** Every account the post may target — the selectable set. */
  accounts: SocialAccount[];
  /** Initial draft when uncontrolled. */
  defaultValue?: SocialPostComposerDraft;
  onValueChange?: (value: SocialPostComposerDraft) => void;
  /** Controlled draft. */
  value?: SocialPostComposerDraft;
}

function hasValue(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Headless state for a **whole social post** — the page-level context a composer needs
 * beyond the per-platform config: which accounts are targeted, the base caption, the
 * picked media, the schedule, and the draft flag. It OWNS the config slice too, delegating
 * it to {@link useSocialPostConfiguration} (single source of truth — no parallel copy), and
 * re-exposes that hook's surface under {@link config}.
 *
 * Use it to drive a media preview, a caption count, and the Publish gate ({@link canPublish})
 * from one place, then hand {@link toCreatePost} straight to `socialPosts.create`. Renderer-
 * and validation-agnostic (Zod-free); pair with the validation item for full refinement.
 */
export function useSocialPostComposer({
  accounts,
  value,
  defaultValue = EMPTY_DRAFT,
  onValueChange,
}: UseSocialPostComposerOptions) {
  const [uncontrolled, setUncontrolled] =
    useState<SocialPostComposerDraft>(defaultValue);
  const isControlled = value !== undefined;
  const draft = isControlled ? value : uncontrolled;

  const setDraft = (next: SocialPostComposerDraft) => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  const patch = (partial: Partial<SocialPostComposerDraft>) =>
    setDraft({ ...draft, ...partial });

  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const targetedAccounts = useMemo(
    () =>
      draft.socialAccounts
        .map((id) => accountsById.get(id))
        .filter((account): account is SocialAccount => account != null),
    [draft.socialAccounts, accountsById],
  );

  const platforms = useMemo<SocialProvider[]>(
    () => [...new Set(targetedAccounts.map((account) => account.platform))],
    [targetedAccounts],
  );

  // The config slice — same value, owned here, delegated to the config hook.
  const config: UseSocialPostConfigurationReturn = useSocialPostConfiguration({
    accounts: targetedAccounts,
    value: draft.configuration,
    onValueChange: (configuration) => patch({ configuration }),
  });

  // Every targeted ACCOUNT has its required, visible fields filled — resolved by the account's
  // EFFECTIVE value (account override ▸ platform ▸ default), so a required option set at EITHER
  // tier counts (e.g. TikTok privacy set on the account alone satisfies that account). Zod-free —
  // the same check the config accordion's validity dot uses.
  const requiredComplete = useMemo(
    () =>
      targetedAccounts.every((account) =>
        config
          .visibleFieldsForAccount(account.id)
          .filter((field) => field.required)
          .every((field) => hasValue(config.getAccountValue(account.id, field.key))),
      ),
    [targetedAccounts, config],
  );

  // A schedule, if set, must be a valid instant in the future.
  const scheduleValid =
    !draft.scheduledAt ||
    (() => {
      const time = new Date(draft.scheduledAt).getTime();
      return !Number.isNaN(time) && time > Date.now();
    })();

  const canPublish =
    targetedAccounts.length > 0 &&
    (draft.caption.trim().length > 0 || draft.media.length > 0) &&
    requiredComplete &&
    scheduleValid;

  /** Media items still holding a local file that hasn't been uploaded yet. Upload these
   * (create-upload-url → PUT) at publish time, then pass the resolved urls to
   * {@link toCreatePost}. */
  const pendingMedia = useMemo(
    () => draft.media.filter((item) => item.file && !item.url),
    [draft.media],
  );

  /**
   * Assemble the create-post body. Because uploads happen at publish time, pass a
   * `mediaUrls` map (media `id` → the hosted URL you got back from uploading); each item's
   * other options (tags, thumbnail, skip-processing) come from the draft and are preserved.
   * Items with no resolved/hosted `url` are dropped (they were never uploaded).
   */
  const toCreatePost = (resolved?: {
    mediaUrls?: Record<string, string>;
  }): SocialPostCreateBody => {
    const media = draft.media
      .map((item): SocialPostCreateBodyMedia | null => {
        const url = resolved?.mediaUrls?.[item.id] ?? item.url;
        if (!url) return null;
        return {
          url,
          thumbnail_url: item.thumbnailUrl ?? undefined,
          thumbnail_timestamp_ms: item.thumbnailTimestampMs ?? undefined,
          skip_processing: item.skipProcessing ?? undefined,
          tags: item.tags ?? undefined,
        };
      })
      .filter((entry): entry is SocialPostCreateBodyMedia => entry != null);
    return {
      caption: draft.caption,
      social_accounts: draft.socialAccounts,
      media: media.length > 0 ? media : undefined,
      scheduled_at: draft.scheduledAt ?? undefined,
      isDraft: draft.isDraft,
      ...draft.configuration,
    };
  };

  return {
    /** The whole draft. */
    value: draft,
    /** Every selectable account. */
    accounts,
    /** The selected accounts, resolved to full records. */
    targetedAccounts,
    /** Distinct platforms among the targeted accounts. */
    platforms,

    // accounts tier
    setSocialAccounts: (ids: string[]) => patch({ socialAccounts: ids }),
    toggleAccount: (id: string) =>
      patch({
        socialAccounts: draft.socialAccounts.includes(id)
          ? draft.socialAccounts.filter((existing) => existing !== id)
          : [...draft.socialAccounts, id],
      }),
    removeAccount: (id: string) =>
      patch({
        socialAccounts: draft.socialAccounts.filter((existing) => existing !== id),
      }),

    // caption
    caption: draft.caption,
    setCaption: (caption: string) => patch({ caption }),

    // media
    media: draft.media,
    /** Media still holding a local file to upload at publish time (see {@link toCreatePost}). */
    pendingMedia,
    setMedia: (media: SocialPostComposerMedia[]) => patch({ media }),
    // New media lands at the FRONT of the strip.
    addMedia: (items: SocialPostComposerMedia[]) =>
      patch({ media: [...items, ...draft.media] }),
    removeMedia: (id: string) =>
      patch({ media: draft.media.filter((item) => item.id !== id) }),

    // schedule + draft flag
    scheduledAt: draft.scheduledAt,
    setScheduledAt: (scheduledAt: string | null) => patch({ scheduledAt }),
    isDraft: draft.isDraft,
    setIsDraft: (isDraft: boolean) => patch({ isDraft }),

    /** The per-platform configuration value — the `<SocialPostConfiguration>` controlled value. */
    configuration: draft.configuration,
    setConfiguration: (configuration: SocialPostConfiguration) =>
      patch({ configuration }),
    /** The per-platform configuration sub-API (see {@link useSocialPostConfiguration}). */
    config,

    /** Every required, visible field is filled across all targeted platforms. */
    requiredComplete,
    /** Ready to publish: ≥1 account, some content, required config complete. */
    canPublish,
    /** The assembled create-post body — hand straight to `socialPosts.create`. */
    toCreatePost,
  };
}

export type UseSocialPostComposerReturn = ReturnType<typeof useSocialPostComposer>;

const SocialPostComposerContext =
  createContext<UseSocialPostComposerReturn | null>(null);

/**
 * Runs {@link useSocialPostComposer} once and shares it via context, so the composer's
 * parts (account picker, media grid, caption, config accordion, publish bar) all read and
 * write the same draft without prop-drilling. Controlled/uncontrolled like the hook.
 */
export function SocialPostComposerProvider({
  children,
  ...options
}: UseSocialPostComposerOptions & { children: ReactNode }) {
  const composer = useSocialPostComposer(options);
  return createElement(
    SocialPostComposerContext.Provider,
    { value: composer },
    children,
  );
}

/** Read the composer draft from the nearest {@link SocialPostComposerProvider}. */
export function useSocialPostComposerContext(): UseSocialPostComposerReturn {
  const context = useContext(SocialPostComposerContext);
  if (!context) {
    throw new Error(
      "useSocialPostComposerContext must be used within a <SocialPostComposerProvider>.",
    );
  }
  return context;
}
