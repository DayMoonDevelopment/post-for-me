"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  resolveSocialPost,
  resolveSocialPostViews,
  type SocialPostPreviewView,
} from "~/lib/social-post-preview-resolver";
import type {
  SocialPostPreviewDescriptor,
  SocialPostPreviewInput,
} from "~/lib/social-post-preview-types";

/**
 * Materialize any local `File`/`Blob` in the input's media into an object URL, returning an
 * input whose media is URL-only — so the resolver and every render primitive stay pure URL
 * consumers. Owns the object-URL lifecycle: one URL per blob (created once, reused across
 * renders), revoked when the blob leaves the input or the component unmounts. Only `post.media`
 * can hold a local file (a quoted post is always URL-only), so that's all this walks.
 */
function useMaterializedInput(
  post: SocialPostPreviewInput,
): SocialPostPreviewInput {
  // A stable id per blob (by identity), so the effect's dependency changes only when the actual
  // set of local files changes — not on every render (each `post.media` is a fresh array).
  const idsRef = useRef<{ ids: WeakMap<Blob, number>; next: number }>(null);
  if (!idsRef.current) idsRef.current = { ids: new WeakMap(), next: 0 };
  const { ids } = idsRef.current;

  const files: Blob[] = [];
  for (const item of post.media ?? []) {
    if (item.file instanceof Blob) files.push(item.file);
  }
  for (const file of files) {
    if (!ids.has(file)) ids.set(file, idsRef.current.next++);
  }
  const key = files.map((file) => ids.get(file)).join(",");

  // Create object URLs in an effect (not in render) and revoke them on change / unmount — the
  // one place that owns the blob→URL lifecycle. Effect-created + state means StrictMode's
  // mount→unmount→mount recreates a live URL rather than leaving a revoked one on the <img>.
  const [urlByFile, setUrlByFile] = useState<Map<Blob, string>>(
    () => new Map(),
  );
  useEffect(() => {
    const map = new Map<Blob, string>();
    for (const file of files) map.set(file, URL.createObjectURL(file));
    setUrlByFile(map);
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url);
    };
    // `files` is derived 1:1 from `key`; depending on `key` avoids re-running every render.
  }, [key]);

  return useMemo(
    () => ({
      ...post,
      media: post.media?.map((item) =>
        item.file instanceof Blob && !item.url
          ? { ...item, url: urlByFile.get(item.file) }
          : item,
      ),
    }),
    [post, urlByFile],
  );
}

/** What {@link useSocialPostPreview} returns — the resolved render model for a post. */
export interface UseSocialPostPreviewResult {
  /** One descriptor per targeted account, config cascade applied. */
  descriptors: SocialPostPreviewDescriptor[];
  /** The distinct preview options a switcher can toggle between. */
  views: SocialPostPreviewView[];
}

/**
 * The headless engine behind {@link SocialPostPreview}: give it a Post for Me
 * {@link SocialPostPreviewInput} and it (1) materializes any local `File`/`Blob` media into
 * object URLs (owning their lifecycle), then (2) resolves the configuration cascade into the
 * render model — the per-account {@link SocialPostPreviewDescriptor}s and the distinct
 * {@link SocialPostPreviewView}s. Compose it with the `ui/social-post-preview` primitives
 * (device, chrome, frame provider) to build your own preview surface.
 */
export function useSocialPostPreview(
  post: SocialPostPreviewInput,
): UseSocialPostPreviewResult {
  const resolvedPost = useMaterializedInput(post);
  const descriptors = useMemo(
    () => resolveSocialPost(resolvedPost),
    [resolvedPost],
  );
  const views = useMemo(
    () => resolveSocialPostViews(resolvedPost),
    [resolvedPost],
  );
  return { descriptors, views };
}
