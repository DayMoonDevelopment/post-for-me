"use client";

import { useState } from "react";

import {
  AccountSelector,
  AccountSelectorContent,
  AccountSelectorTrigger,
} from "~/components/account-selector";
import { UserAvatarBadge, UserAvatarIconBadge } from "~/components/user-avatar";
import { BrandMark } from "~/ui/brand-mark";
import { UserBadge } from "~/components/user-badge";
import type { SocialAccount } from "~/lib/post-for-me.types";
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
 * A **multi-select combobox**: the picked accounts render as removable badges INSIDE
 * the trigger box (like tags); clicking any empty space opens the popover Command to
 * add more. The trigger is a full-box layer *behind* the chips — siblings in the DOM,
 * so the chip × buttons stay valid and clicks on empty space open the list.
 *
 * This variation shows the platform as an **accessory notched on the avatar**.
 */
export function AccountSelectorComboboxAccessory() {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "ig-jane",
    "x-marcus",
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
      <div className="relative flex min-h-9 w-80 flex-wrap items-center gap-1 cn-control-radius border border-input px-1.5 py-1 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        {/* Full-box trigger, behind the chips — click empty space (or the chevron) to
            open. The sr-only child names the button AND suppresses the trigger's default
            count+chevron content (we render our own chevron below). */}
        <AccountSelectorTrigger className="absolute inset-0 size-full cn-control-radius outline-none">
          <span className="sr-only">Select accounts</span>
        </AccountSelectorTrigger>
        {selected.length === 0 ? (
          <span className="pointer-events-none z-10 px-1 text-sm text-muted-foreground">
            Select accounts
          </span>
        ) : (
          selected.map((account) => (
            <UserBadge
              key={account.id}
              name={account.displayName ?? account.username}
              src={account.avatarUrl}
              onRemove={() => remove(account.id)}
              className="relative z-10"
            >
              <UserAvatarBadge>
                <UserAvatarIconBadge>
                  <BrandMark platform={account.platform} />
                </UserAvatarIconBadge>
              </UserAvatarBadge>
            </UserBadge>
          ))
        )}
        <IconPlaceholder
          lucide="ChevronsUpDown"
          tabler="IconSelector"
          phosphor="CaretUpDown"
          hugeicons="UnfoldMoreIcon"
          remixicon="RiExpandUpDownLine"
          aria-hidden
          className="pointer-events-none z-10 ml-auto size-4 shrink-0 text-muted-foreground opacity-50"
        />
      </div>
      <AccountSelectorContent />
    </AccountSelector>
  );
}
