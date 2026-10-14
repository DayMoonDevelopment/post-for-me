"use client";

import type { ComponentProps, ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";

/**
 * Rotation state for a multi-story post. A Post for Me "story" can carry several media — each is
 * published as its own story — so the preview rotates through them like the real app: manual
 * tap (see {@link StoryTapZones}) and, when `autoAdvance` is on, a timer that advances every
 * `intervalMs` and loops. Auto-advance is skipped under `prefers-reduced-motion`.
 */
export function useStoryRotation(
  count: number,
  { autoAdvance = false, intervalMs = 4000 }: { autoAdvance?: boolean; intervalMs?: number } = {},
) {
  const total = Math.max(1, count);
  const [activeIndex, setActiveIndex] = useState(0);

  // Keep the index in range if the media set shrinks.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, total - 1));
  }, [total]);

  // Next loops (last → first); back is a dead-end at the first story (clamped, no wrap).
  const next = () => setActiveIndex((i) => (i + 1) % total);
  const prev = () => setActiveIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    if (!autoAdvance || total <= 1) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = setInterval(
      () => setActiveIndex((i) => (i + 1) % total),
      intervalMs,
    );
    return () => clearInterval(timer);
  }, [autoAdvance, total, intervalMs]);

  return { activeIndex, next, prev };
}

/**
 * Full-bleed tap targets over the story — left third goes back, the rest advances (like IG/FB).
 * On the first story (`canPrev` false) there's nothing before it, so the whole area advances.
 */
export function StoryTapZones({
  onPrev,
  onNext,
  canPrev = true,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-10 flex">
      {canPrev ? (
        <button
          type="button"
          aria-label="Previous story"
          onClick={onPrev}
          className="h-full w-1/3 cursor-pointer focus:outline-none"
        />
      ) : null}
      <button
        type="button"
        aria-label="Next story"
        onClick={onNext}
        className="h-full flex-1 cursor-pointer focus:outline-none"
      />
    </div>
  );
}

/**
 * A preview-only affordance: an edge arrow hinting "tap here for the previous / next story",
 * with a subtle horizontal nudge so the tap action reads at a glance. Decorative
 * (pointer-events-none) so the tap lands on {@link StoryTapZones} beneath it; the nudge is
 * `motion-safe` only.
 */
export function StoryAdvanceHint({
  direction = "next",
  hidden = false,
}: {
  direction?: "next" | "prev";
  /** Keep it mounted (so its bounce stays in phase with the other arrow) but not shown. */
  hidden?: boolean;
}) {
  const prev = direction === "prev";
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 z-20 -translate-y-1/2",
        prev ? "left-[0.6em]" : "right-[0.6em]",
        hidden && "invisible",
      )}
    >
      <span
        className={cn(
          "grid size-[1.9em] place-items-center rounded-full bg-white/75 text-black [&_svg]:size-[1.1em]",
          // One shared keyframe + `animate-*` utility (shipped via the item's css/cssVars,
          // mirrored in app.css); direction is a CSS var so prev nudges the other way.
          "motion-safe:animate-social-post-story-arrow",
          prev && "[--social-post-story-arrow-dir:-1]",
        )}
      >
        {prev ? (
          <IconPlaceholder
            lucide="ArrowLeft"
            tabler="IconArrowLeft"
            phosphor="ArrowLeft"
            hugeicons="ArrowLeft02Icon"
            remixicon="RiArrowLeftLine"
          />
        ) : (
          <IconPlaceholder
            lucide="ArrowRight"
            tabler="IconArrowRight"
            phosphor="ArrowRight"
            hugeicons="ArrowRight02Icon"
            remixicon="RiArrowRightLine"
          />
        )}
      </span>
    </span>
  );
}

/**
 * Composes a platform's story primitives (frame + media + UI) into a **rotating** story: it owns
 * the active index, feeds `count`/`activeIndex` to the UI's segmented progress bar, shows the
 * current media, and — when there's more than one — adds the tap zones + the next-story hint.
 * Shared by every story surface; the frame/media/ui are passed in so the same logic drives
 * Instagram, Facebook, etc.
 */
export function StoryRotator({
  frame: Frame,
  mediaLayer: MediaLayer,
  ui: UILayer,
  items,
  username,
  displayName,
  avatarSrc,
  caption,
  autoAdvance = false,
}: {
  frame: ComponentType<ComponentProps<"div"> & { children?: ReactNode }>;
  mediaLayer: ComponentType<{
    imageSrc?: string;
    videoSrc?: string;
    thumbnailSrc?: string;
  }>;
  ui: ComponentType<{
    username?: string;
    displayName?: string;
    avatarSrc?: string;
    caption?: string;
    count?: number;
    activeIndex?: number;
  }>;
  items: SocialPostPreviewMedia[];
  username?: string;
  displayName?: string;
  avatarSrc?: string;
  caption?: string;
  autoAdvance?: boolean;
}) {
  const { activeIndex, next, prev } = useStoryRotation(items.length, {
    autoAdvance,
  });
  const current = items[activeIndex];
  const multi = items.length > 1;

  return (
    <Frame>
      <MediaLayer
        imageSrc={current?.kind === "image" ? current.src : undefined}
        videoSrc={current?.kind === "video" ? current.videoSrc : undefined}
        thumbnailSrc={current?.kind === "video" ? current.src : undefined}
      />
      <UILayer
        username={username}
        displayName={displayName}
        avatarSrc={avatarSrc}
        caption={caption}
        count={items.length}
        activeIndex={activeIndex}
      />
      {multi ? (
        <>
          <StoryTapZones
            onPrev={prev}
            onNext={next}
            canPrev={activeIndex > 0}
          />
          {/* Both arrows stay mounted so their bounces share one clock; the back arrow is just
              hidden on the first story (nothing before it). */}
          <StoryAdvanceHint direction="prev" hidden={activeIndex === 0} />
          <StoryAdvanceHint direction="next" />
        </>
      ) : null}
    </Frame>
  );
}
