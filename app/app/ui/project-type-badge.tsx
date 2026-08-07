import type { ComponentProps } from "react";

import type { ProjectType } from "~/lib/types/project";

import { RocketIcon, TagIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback } from "~/ui/avatar";

/**
 * The branded reference for a project's type. Quickstart vs White Label each
 * own a fixed icon + accent so users learn the association at a glance.
 *
 * Color is not hard-coded: the element carries `data-brand={type}`, which
 * re-points `--primary` for itself and its children (see app.css). So these
 * read `text-primary` / `bg-primary` and the right accent falls out — and it
 * still composes with light/dark. Change the look once, in the theme tokens.
 */
const PROJECT_TYPE: Record<
  ProjectType,
  { Icon: typeof RocketIcon; label: string; }
> = {
  quickstart: { label: "Quickstart", Icon: RocketIcon },
  "white-label": { label: "White Label", Icon: TagIcon },
};

/**
 * A rounded {@link Avatar} themed to the project type: the type's brand color as
 * a soft fill with the type icon centered. The project-type namespace is scoped
 * to this NON-INTERACTIVE display element (`data-brand` re-points `--primary`
 * for it alone) — never put it on a wrapper that contains interactive controls.
 */
export function ProjectTypeAvatar({
  type,
  className,
  shape = "rounded",
}: {
  className?: string;
  shape?: "circle" | "rounded";
  type: ProjectType;
}) {
  const { label, Icon } = PROJECT_TYPE[type];
  return (
    <Avatar
      data-brand={type}
      className={cn(
        shape === "circle" ? "rounded-full" : "rounded-lg after:rounded-lg",
        className,
      )}
    >
      <AvatarFallback className="rounded-[inherit] bg-primary/10 text-primary [&_svg]:size-[55%]">
        <Icon aria-label={label} />
      </AvatarFallback>
    </Avatar>
  );
}

/** Just the brand-colored type icon — for dense spots like the project list. */
export function ProjectTypeIcon({
  type,
  className,
}: {
  className?: string;
  type: ProjectType;
}) {
  const { label, Icon } = PROJECT_TYPE[type];
  return (
    <Icon
      data-brand={type}
      aria-label={label}
      // `!` so the brand color survives container rules that mute icons
      // (e.g. a dropdown menu's `[&_svg]:text-muted-foreground`).
      className={cn("text-primary!", className)}
    />
  );
}

/**
 * Icon + label — the full, trainable branded unit.
 *
 * - `soft` / `solid`: a filled pill, for standalone emphasis.
 * - `ghost`: bare brand-colored icon + label, no chrome — for use as a trailing
 *   descriptor inside a row that already has its own leading icon.
 */
const BADGE_VARIANTS: Record<"soft" | "solid" | "ghost", string> = {
  soft: "rounded-md px-2 py-0.5 bg-primary/10 text-primary",
  solid: "rounded-md px-2 py-0.5 bg-primary text-primary-foreground",
  ghost: "text-primary",
};

export function ProjectTypeBadge({
  type,
  variant = "soft",
  withLabel = true,
  className,
  ...props
}: {
  type: ProjectType;
  variant?: "soft" | "solid" | "ghost";
  withLabel?: boolean;
} & ComponentProps<"span">) {
  const { label, Icon } = PROJECT_TYPE[type];
  return (
    <span
      data-brand={type}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {withLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  );
}
