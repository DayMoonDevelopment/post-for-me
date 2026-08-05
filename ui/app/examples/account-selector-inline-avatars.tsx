"use client";

import { useState } from "react";

import {
  AccountSelector,
  AccountSelectorContent,
  AccountSelectorTrigger,
} from "~/components/account-selector";
import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarIconBadge,
} from "~/components/user-avatar";
import { BrandMark } from "~/ui/brand-mark";
import type { SocialAccount } from "~/lib/post-for-me.types";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import { IconPlaceholder } from "~/ui/icon-placeholder";

// Sample connected accounts — swap in your own from the API.
const ACCOUNTS: SocialAccount[] = [
  {
    id: "ig-jane",
    platform: "instagram",
    username: "janedoe",
    displayName: "Jane Doe",
  },
  {
    id: "x-marcus",
    platform: "x",
    username: "marcuslee",
    displayName: "Marcus Lee",
  },
  {
    id: "tt-hub",
    platform: "tiktok",
    username: "creatorhub",
    displayName: "Creator Hub",
  },
  {
    id: "li-jane",
    platform: "linkedin",
    username: "jane-doe",
    displayName: "Jane Doe",
  },
  {
    id: "yt-pfm",
    platform: "youtube",
    username: "postforme",
    displayName: "Post for Me",
  },
];

/**
 * Pick accounts, then show them as an **overlapping avatar cluster** beside a round
 * "+" trigger — the compact display for a toolbar or a "posting as" row.
 *
 * - **Empty:** a bordered "＋ Select account" button.
 * - **1+:** a round "+" (opens the picker) plus the avatars, each with the platform
 *   notched lower-right.
 * - **Hover the cluster:** the avatars fan out and each reveals a remove × upper-left.
 *
 * First avatar renders on top (descending z-index) so the lower-right notches stay
 * visible while stacked; the × only appears once they've fanned apart.
 */
export function AccountSelectorInlineAvatars() {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "ig-jane",
    "x-marcus",
    "tt-hub",
  ]);
  const selected = ACCOUNTS.filter((account) =>
    selectedIds.includes(account.id),
  );

  const remove = (id: string) =>
    setSelectedIds((ids) => ids.filter((existing) => existing !== id));

  return (
    <AccountSelector
      accounts={ACCOUNTS}
      value={selectedIds}
      onValueChange={setSelectedIds}
    >
      {/* Left-anchored: the + and first avatar hold position while the cluster fans
          out into the trailing space, instead of the row re-centering as it grows. */}
      <div className="flex w-full items-center">
        {selected.length === 0 ? (
          // Empty: a real shadcn Button (outline) so it carries the active /create style's
          // bg + rounding. `render` makes the popover trigger render AS the Button.
          <AccountSelectorTrigger render={<Button variant="outline" />}>
            <IconPlaceholder
              lucide="Plus"
              tabler="IconPlus"
              phosphor="Plus"
              hugeicons="PlusSignIcon"
              remixicon="RiAddLine"
              aria-hidden
            />
            Select account
          </AccountSelectorTrigger>
        ) : (
          <div className="flex items-center gap-3">
            {/* The "add" trigger is a shadcn Button (secondary) — its per-style bg and
              rounding come from the Button primitive, not a hand-styled circle. */}
            <AccountSelectorTrigger
              render={
                <Button variant="secondary" size="icon" className="size-11" />
              }
            >
              <IconPlaceholder
                lucide="Plus"
                tabler="IconPlus"
                phosphor="Plus"
                hugeicons="PlusSignIcon"
                remixicon="RiAddLine"
                className="size-5"
                aria-hidden
              />
              <span className="sr-only">Add account</span>
            </AccountSelectorTrigger>

            <div className="group/cluster flex items-center">
              {selected.map((account, index) => {
                const name = account.displayName ?? account.username;
                return (
                  <div
                    key={account.id}
                    className={cn(
                      "relative transition-[margin] duration-200",
                      index > 0 && "-ml-4 group-hover/cluster:ml-3",
                    )}
                    style={{ zIndex: selected.length - index }}
                  >
                    <UserAvatar
                      name={name}
                      src={account.avatarUrl}
                      size="lg"
                      className="ring-2 ring-background"
                    >
                      {/* Platform, lower-right (default placement). */}
                      <UserAvatarBadge>
                        <UserAvatarIconBadge>
                          <BrandMark platform={account.platform} />
                        </UserAvatarIconBadge>
                      </UserAvatarBadge>
                      {/* Remove ×, upper-left (secondary) — revealed on cluster hover. */}
                      <UserAvatarBadge
                        placement="secondary"
                        className="opacity-0 transition-opacity group-hover/cluster:opacity-100"
                      >
                        <button
                          type="button"
                          onClick={() => remove(account.id)}
                          aria-label={`Remove ${name}`}
                          className="inline-flex size-5 items-center justify-center rounded-full border border-muted-foreground/40 bg-background text-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3"
                        >
                          <IconPlaceholder
                            lucide="X"
                            tabler="IconX"
                            phosphor="X"
                            hugeicons="Cancel01Icon"
                            remixicon="RiCloseLine"
                            aria-hidden
                          />
                        </button>
                      </UserAvatarBadge>
                    </UserAvatar>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <AccountSelectorContent />
    </AccountSelector>
  );
}
