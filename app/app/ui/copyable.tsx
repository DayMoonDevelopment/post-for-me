"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckIcon, CopyIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

/**
 * Copy a string to the clipboard and expose a transient `copied` flag that
 * resets after `timeout`ms. The composable core of {@link Copyable}, exported so
 * a consumer that needs a bespoke affordance (a menu item, a whole-card click)
 * can wire copy feedback without rebuilding the clipboard + timer plumbing.
 */
export function useCopyToClipboard({
  timeout = 1500,
}: { timeout?: number } = {}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // Clipboard can reject (insecure context, denied permission). Swallow —
        // a copy primitive shouldn't throw into a click handler; the missing
        // confirmation is feedback enough.
        return;
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), timeout);
    },
    [timeout],
  );

  return { copied, copy };
}

type CopyablePosition = "start" | "end" | "none";

interface CopyableProps extends Omit<
  ButtonPrimitive.Props,
  "value" | "children"
> {
  /** Visible content (e.g. a truncated id). Omit for an icon-only affordance. */
  children?: React.ReactNode;
  /** Confirmation label announced + shown after a copy. Default `"Copied"`. */
  copiedLabel?: string;
  /** Where the copy/confirm glyph sits relative to `children` ("none" hides it,
   * for a pure click-to-copy text region). Default `"end"`. */
  icon?: CopyablePosition;
  /** Accessible action label, also the tooltip text. Default `"Copy"`. */
  label?: string;
  /** Wrap the trigger in a tooltip showing `label`/`copiedLabel`. Default `true`. */
  tooltip?: boolean;
  /** The exact text written to the clipboard. */
  value: string;
}

/**
 * A composable copy-to-clipboard control. Renders a button that copies `value`
 * on click, swaps its glyph to a check (and announces "Copied" to assistive
 * tech) for a moment, then resets. It **stops click propagation** so copying
 * from inside a clickable row/card never triggers the row's navigation.
 *
 * Pure UI — no data logic. Style via `className` and the standard Button-style
 * passthrough; compose it as a trailing affordance next to a value, an inline
 * truncated id cell, or an icon-only button.
 */
export function Copyable({
  value,
  children,
  icon = "end",
  label,
  copiedLabel,
  tooltip = true,
  className,
  onClick,
  ...props
}: CopyableProps) {
  const { t } = useTranslation();
  // Defaults live here rather than in the signature so they can be
  // translated; an explicit prop still wins.
  const labelText = label ?? t("common.copy");
  const copiedText = copiedLabel ?? t("common.copied");

  const { copied, copy } = useCopyToClipboard();

  // Both glyphs are stacked and crossfade — the copy icon zooms/fades out as the
  // check zooms/fades in — for a smoother transition than a hard swap.
  const glyph =
    icon === "none" ? null : (
      <span className="relative inline-flex size-3.5 items-center" aria-hidden>
        <CopyIcon
          className={cn(
            "absolute size-3.5 transition-all duration-200 ease-out",
            copied
              ? "scale-50 opacity-0"
              : "scale-100 opacity-60 group-hover/copyable:opacity-100",
          )}
        />
        <CheckIcon
          className={cn(
            "absolute size-3.5 text-success transition-all duration-200 ease-out",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </span>
    );

  const trigger = (
    <ButtonPrimitive
      type="button"
      data-slot="copyable"
      // The whole control is the affordance; describe the action, not the value.
      aria-label={copied ? copiedText : labelText}
      className={cn(
        "group/copyable inline-flex min-w-0 shrink items-center gap-1.5 rounded-sm text-xs/none text-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      onClick={(event) => {
        // Copying must never bubble into a parent row/card click (row → detail).
        event.stopPropagation();
        void copy(value);
        onClick?.(event);
      }}
      {...props}
    >
      {icon === "start" ? glyph : null}
      {children}
      {icon === "end" ? glyph : null}
      {/* Screen-reader-only live region: announce the copy result. */}
      <span aria-live="polite" className="sr-only">
        {copied ? copiedText : ""}
      </span>
    </ButtonPrimitive>
  );

  if (!tooltip) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent>{copied ? copiedText : labelText}</TooltipContent>
    </Tooltip>
  );
}
