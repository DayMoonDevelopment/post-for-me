import type { ComponentProps, CSSProperties } from "react";

import { type ExternalToast, Toaster as Sonner, toast } from "sonner";

import { cn } from "~/lib/utils";

/**
 * App toaster — the canonical base-mira shadcn Sonner, adapted to this project:
 * no `next-themes` (the toast colors come from the app's own CSS tokens, which
 * already flip with the system light/dark axis), so `theme="system"` just keeps
 * Sonner's defaults in step. Mounted once in `root.tsx`, which passes the
 * `dir`-aware `position` for RTL. `closeButton` + `visibleToasts` make toasts
 * dismissable + stackable. The ReUI look: the toast stays neutral (popover-toned)
 * and the TYPE reads from a colored icon — wired to the project's semantic state
 * tokens so it follows the theme (Sonner exposes the icon as `[data-icon]`).
 *
 * Global motion + chrome that Sonner has no props for live in `app/app.css`
 * (keyed off Sonner's `data-*` hooks): bottom-up enter / inline-end exit, the
 * close button inset at the trailing edge, and a muted bottom progress bar that
 * depletes over the toast's lifetime (`--toast-duration`, default 4s).
 */
function Toaster(props: ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      closeButton
      visibleToasts={5}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-destructive",
          warning: "[&_[data-icon]]:text-warning",
          info: "[&_[data-icon]]:text-info",
        },
      }}
      {...props}
    />
  );
}

/**
 * Hide the timer progress bar on a single toast. Spread into the toast options:
 *
 *   toast.error("Couldn't connect", hideProgress())
 *   toast.success("Saved", hideProgress({ duration: 8000 }))
 *
 * (The bar shows by default for time-based toasts; loading toasts never get one.)
 */
export function hideProgress(options?: ExternalToast): ExternalToast {
  return { ...options, className: cn("toast-no-progress", options?.className) };
}

export { toast, Toaster };
