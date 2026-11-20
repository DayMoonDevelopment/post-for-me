import type * as React from "react";

import { useTranslation } from "react-i18next";

import { AddIcon } from "~/icons";
import { PLATFORM_LABELS, PLATFORM_ORDER } from "~/lib/post-for-me.utils";
import { cn } from "~/lib/utils";
import { BrandMark } from "~/ui/brand-mark";
import { Button } from "~/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";

/**
 * "Connect a social account" as a platform dropdown: the trigger button opens a
 * menu with one item per supported provider (brand mark + label). Picking a
 * provider will start that platform's OAuth hand-off (PFM-696) — the items are
 * inert until that lands.
 *
 * The compact, pick-the-platform-directly counterpart to
 * {@link ConnectAccountDialog} (which opens the full-screen picker). Use this
 * where a "Connect account" button already sits in a toolbar or empty state,
 * like the Social Accounts page. Extra props style the trigger button; pass
 * children to override its label.
 */
export function ConnectAccountMenu({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className={cn("shrink-0", className)} {...props} />}
      >
        <AddIcon aria-hidden />
        {children ?? t("setup.connectAccount.trigger")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {PLATFORM_ORDER.map((platform) => (
          <DropdownMenuItem key={platform}>
            <BrandMark platform={platform} />
            {PLATFORM_LABELS[platform]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
