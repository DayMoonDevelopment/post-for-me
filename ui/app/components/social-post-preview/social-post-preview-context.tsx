"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { SocialPostPreviewDescriptor } from "~/lib/social-post-preview-types";

const SocialPostPreviewFrameContext =
  createContext<SocialPostPreviewDescriptor | null>(null);

/**
 * Scopes one {@link SocialPostPreviewDescriptor} to a single frame's subtree, so the
 * device + chrome render that account's post. {@link SocialPostPreview} wraps
 * each frame in one; a consumer hand-composing frames can too.
 */
export function SocialPostPreviewFrameProvider({
  descriptor,
  children,
}: {
  descriptor: SocialPostPreviewDescriptor;
  children: ReactNode;
}) {
  return (
    <SocialPostPreviewFrameContext.Provider value={descriptor}>
      {children}
    </SocialPostPreviewFrameContext.Provider>
  );
}

/**
 * Read the current frame's descriptor, or `null` outside a frame. Nullable by design:
 * a chrome may instead take an explicit `descriptor` prop (the manual escape hatch).
 */
export function useSocialPostPreviewFrame(): SocialPostPreviewDescriptor | null {
  return useContext(SocialPostPreviewFrameContext);
}
