"use client";

import type { ComponentProps, ReactNode } from "react";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
// POST-INSTALL ADAPTATION (re-apply after re-vendoring from @post-for-me):
// the registry is framework-agnostic and ships this component's copy in
// English, so its user-facing strings are localized HERE, in the same way its
// lucide imports are rebound to `~/icons`. Keep any new copy behind `t()`.
import { useTranslation } from "react-i18next";

import type { SocialProvider } from "~/lib/post-for-me.types";

import {
  PlatformAvatar,
  PlatformAvatarBadge,
  PlatformAvatarStatusBadge,
} from "~/components/platform-avatar";
import {
  countCaptionLength,
  getMostRestrictivePlatform,
  PLATFORM_CAPTION_LIMITS,
} from "~/lib/post-for-me.utils";
import { cn } from "~/lib/utils";
import { Field, FieldLabel } from "~/ui/field";
import { StatusIndicator } from "~/ui/status-indicator";
import { Textarea } from "~/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

/** A caption measured against one platform's limit — local to this component. */
type CaptionComposerEvaluation = {
  count: number;
  isOver: boolean;
  limit: number;
  platform: SocialProvider;
  /** `limit - count`; negative once the caption is too long. */
  remaining: number;
};

/** Measure a caption against a single platform's limit. */
function evaluate(
  text: string,
  platform: SocialProvider,
): CaptionComposerEvaluation {
  const count = countCaptionLength(text);
  const limit = PLATFORM_CAPTION_LIMITS[platform];
  const remaining = limit - count;
  return { platform, count, limit, remaining, isOver: remaining < 0 };
}

type CaptionComposerContextValue = {
  /** Ties the title's label to the textarea. */
  fieldId: string;
  /** Measure the caption against one platform's limit. */
  getEvaluation: (platform: SocialProvider) => CaptionComposerEvaluation;
  /** True when the caption exceeds the tightest selected platform's limit. */
  isOverAny: boolean;
  /** Grapheme length of the caption, independent of any platform. */
  length: number;
  /** The tightest selected platform (smallest limit), or null when none. */
  mostRestrictive: SocialProvider | null;
  platforms: SocialProvider[];
  setValue: (value: string) => void;
  value: string;
};

const CaptionComposerContext =
  createContext<CaptionComposerContextValue | null>(null);

/** Read the composer state; throws when used outside `<CaptionComposer>`. */
function useCaptionComposer(): CaptionComposerContextValue {
  const context = useContext(CaptionComposerContext);
  if (!context) {
    throw new Error(
      "CaptionComposer parts must be used within a <CaptionComposer>.",
    );
  }
  return context;
}

/**
 * The root of the caption composer — a {@link Field} that owns the caption text
 * (controlled via `value`/`onValueChange` or uncontrolled via `defaultValue`) and
 * evaluates it against the `platforms` you target, sharing both with its parts.
 * Assemble a {@link CaptionComposerInput} plus optional
 * {@link CaptionComposerHeader}/{@link CaptionComposerFooter} inside it.
 */
export function CaptionComposer({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  platforms = [],
  className,
  children,
  ...props
}: {
  children?: ReactNode;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  platforms?: SocialProvider[];
  value?: string;
} & Omit<ComponentProps<typeof Field>, "defaultValue" | "onChange">) {
  const fieldId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : uncontrolled;

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const context = useMemo<CaptionComposerContextValue>(() => {
    const getEvaluation = (platform: SocialProvider) =>
      evaluate(value, platform);
    return {
      value,
      setValue,
      platforms,
      fieldId,
      length: countCaptionLength(value),
      getEvaluation,
      isOverAny: platforms.some((platform) => getEvaluation(platform).isOver),
      mostRestrictive: getMostRestrictivePlatform(platforms),
    };
  }, [value, setValue, platforms, fieldId]);

  return (
    <CaptionComposerContext.Provider value={context}>
      <Field data-slot="caption-composer" className={className} {...props}>
        {children}
      </Field>
    </CaptionComposerContext.Provider>
  );
}

/** An optional row above the input — for the title, the count, or actions. */
export function CaptionComposerHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="caption-composer-header"
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    />
  );
}

/**
 * The field's label/prompt (e.g. "What do you want to post?") — a
 * {@link FieldLabel} wired to the textarea for accessibility.
 */
export function CaptionComposerTitle({
  className,
  ...props
}: ComponentProps<typeof FieldLabel>) {
  const { fieldId } = useCaptionComposer();
  return (
    <FieldLabel
      htmlFor={fieldId}
      data-slot="caption-composer-title"
      className={className}
      {...props}
    />
  );
}

/** An optional row below the input — typically the count and platform row. */
export function CaptionComposerFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="caption-composer-footer"
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    />
  );
}

/**
 * The multi-line caption field — a {@link Textarea} with the caption bound. Marks
 * the field invalid (destructive) once the caption exceeds the tightest targeted
 * platform.
 */
export function CaptionComposerInput({
  className,
  ...props
}: Omit<
  ComponentProps<typeof Textarea>,
  "value" | "defaultValue" | "onChange"
>) {
  const { value, setValue, isOverAny, fieldId } = useCaptionComposer();

  return (
    <Textarea
      id={fieldId}
      data-slot="caption-composer-input"
      data-over-limit={isOverAny || undefined}
      aria-invalid={isOverAny || undefined}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={className}
      {...props}
    />
  );
}

/**
 * A live character count — the current length only. Turns destructive once the
 * caption exceeds its target: the `platform` you pass, else the tightest
 * targeted platform.
 */
export function CaptionComposerCount({
  platform,
  className,
  ...props
}: {
  platform?: SocialProvider;
} & ComponentProps<"span">) {
  const { length, getEvaluation, mostRestrictive } = useCaptionComposer();
  const target = platform ?? mostRestrictive ?? undefined;
  const isOver = target ? getEvaluation(target).isOver : false;

  return (
    <span
      data-slot="caption-composer-count"
      data-over-limit={isOver || undefined}
      className={cn(
        "text-xs text-muted-foreground tabular-nums data-[over-limit]:text-destructive",
        className,
      )}
      {...props}
    >
      {length}
    </span>
  );
}

/**
 * The row of targeted-platform avatars. Renders one
 * {@link CaptionComposerPlatform} per targeted platform by default; pass explicit
 * children to control which appear and how.
 */
export function CaptionComposerPlatforms({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { platforms } = useCaptionComposer();
  return (
    <div
      data-slot="caption-composer-platforms"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {children ??
        platforms.map((platform) => (
          <CaptionComposerPlatform key={platform} platform={platform} />
        ))}
    </div>
  );
}

/**
 * A single targeted platform: a compact {@link PlatformAvatar} with a
 * valid/invalid status dot, and a tooltip showing that network's maximum caption
 * length. Flips to destructive once the caption is too long for it.
 */
export function CaptionComposerPlatform({
  platform,
  className,
}: {
  className?: string;
  platform: SocialProvider;
}) {
  const { getEvaluation } = useCaptionComposer();
  const evaluation = getEvaluation(platform);
  const { t } = useTranslation();

  return (
    <Tooltip>
      {/* Plain trigger (no render/asChild) so the component stays base-agnostic —
          identical in Base UI and Radix. It renders as a button, so reset the native
          chrome to keep the avatar's look; cursor is left to inherit the consumer's
          pointer preference. The extra benefit is a keyboard-focusable trigger. */}
      <TooltipTrigger
        data-slot="caption-composer-platform"
        data-over-limit={evaluation.isOver || undefined}
        className={cn(
          "inline-flex appearance-none border-0 bg-transparent p-0",
          className,
        )}
      >
        {/* Compact for the footer row. Use the `size` prop (not a className) so the
            corner radius scales with the box and stays a rounded square, not a circle. */}
        <PlatformAvatar platform={platform} size="sm">
          <PlatformAvatarBadge>
            <PlatformAvatarStatusBadge>
              <StatusIndicator
                status={evaluation.isOver ? "destructive" : "success"}
              />
            </PlatformAvatarStatusBadge>
          </PlatformAvatarBadge>
        </PlatformAvatar>
      </TooltipTrigger>
      <TooltipContent>
        {/* POST-INSTALL ADAPTATION: localized copy. `count` drives i18next's
            plural selection; the digit grouping comes from the `{{count, number}}`
            format spec in the locale string, which is what replaces upstream's
            `toLocaleString()`. A bare `{{count}}` renders "2200", not "2,200". */}
        {t("playground.captionMaxCharacters", {
          count: PLATFORM_CAPTION_LIMITS[platform],
        })}
      </TooltipContent>
    </Tooltip>
  );
}
