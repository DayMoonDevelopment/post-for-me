import type { ComponentType } from "react";

import { useTranslation } from "react-i18next";

import type { SocialPostStatus } from "~/lib/types/social-post";

import {
  CheckIcon,
  DraftIcon,
  type IconProps,
  LoadingIcon,
  ScheduleIcon,
} from "~/icons";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/ui/tooltip";

/** Each post status's icon + tint. `processing` reuses the loading glyph (spun
 * at the call site). The single place a post status maps to its glyph + hue,
 * shared by the grid's icon-only cell and the detail header. */
const STATUS_META: Record<
  SocialPostStatus,
  { className: string; Icon: ComponentType<IconProps>; spin?: boolean }
> = {
  draft: { Icon: DraftIcon, className: "text-muted-foreground" },
  scheduled: { Icon: ScheduleIcon, className: "text-info" },
  processing: { Icon: LoadingIcon, className: "text-warning", spin: true },
  // A plain green checkmark (no circle) — the circle would compete with the
  // per-account circular status dot on the account avatars.
  processed: { Icon: CheckIcon, className: "text-success" },
};

/** Detail-page badge variant per status (light semantic chips). */
export const POST_STATUS_BADGE: Record<
  SocialPostStatus,
  "secondary" | "info-light" | "warning-light" | "success-light"
> = {
  draft: "secondary",
  scheduled: "info-light",
  processing: "warning-light",
  processed: "success-light",
};

/**
 * The post status as an **icon only**, with a hover tooltip carrying the full
 * status name (the posts-grid status column). Color + glyph come from the shared
 * {@link STATUS_META}; the label is translated from `socialPosts.status.*`.
 */
export function PostStatusIcon({
  status,
  className,
}: {
  className?: string;
  status: SocialPostStatus;
}) {
  const { t } = useTranslation();
  const { Icon, className: tint, spin } = STATUS_META[status];
  const label = t(`socialPosts.status.${status}`);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex"
            aria-label={label}
            role="img"
          >
            <Icon
              className={cn("size-4", tint, spin && "animate-spin", className)}
            />
          </span>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
