"use client";

import type { ComponentProps, ReactNode } from "react";

import { createContext, useContext, useMemo, useState } from "react";

import type { SocialAccount, SocialProvider } from "~/lib/post-for-me.types";

import { UserAvatar } from "~/components/user-avatar";
import { ExpandIcon as ChevronsUpDown } from "~/icons";
import { PLATFORM_LABELS, PLATFORM_ORDER } from "~/lib/post-for-me.utils";
import { cn } from "~/lib/utils";
import { BrandMark } from "~/ui/brand-mark";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/ui/popover";

/** One platform's slice of the list — a header plus its accounts. */
export type AccountSelectorGroup = {
  accounts: SocialAccount[];
  label: string;
  platform: SocialProvider;
};

/** The label shown on an account row — displayName over @username. */
function accountLabel(account: SocialAccount): string {
  return account.displayName?.trim() || account.username;
}

/**
 * Headless state for {@link AccountSelector}: owns the selection (controlled via
 * `value`/`onValueChange` or uncontrolled via `defaultValue`) and derives the
 * platform-grouped, ordered account list. Search + keyboard nav are handled by the
 * `Command` inside {@link AccountSelectorContent}; use this hook directly only to
 * build a fully custom selection UI.
 */
export function useAccountSelector({
  accounts,
  value,
  defaultValue = [],
  onValueChange,
}: {
  accounts: SocialAccount[];
  defaultValue?: string[];
  onValueChange?: (ids: string[]) => void;
  value?: string[];
}) {
  const [uncontrolled, setUncontrolled] = useState<string[]>(defaultValue);
  const isControlled = value !== undefined;
  const selectedIds = useMemo(
    () => new Set(isControlled ? value : uncontrolled),
    [isControlled, value, uncontrolled],
  );

  const setSelected = (next: string[]) => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected([...next]);
  };

  const groups = useMemo<AccountSelectorGroup[]>(() => {
    const byPlatform = new Map<SocialProvider, SocialAccount[]>();
    for (const account of accounts) {
      const list = byPlatform.get(account.platform) ?? [];
      list.push(account);
      byPlatform.set(account.platform, list);
    }
    return PLATFORM_ORDER.filter((p) => byPlatform.get(p)?.length).map(
      (platform) => ({
        platform,
        label: PLATFORM_LABELS[platform],
        accounts: byPlatform.get(platform)!,
      }),
    );
  }, [accounts]);

  return {
    groups,
    selectedIds,
    selectedAccounts: accounts.filter((a) => selectedIds.has(a.id)),
    isSelected: (id: string) => selectedIds.has(id),
    toggle,
    clear: () => setSelected([]),
    count: selectedIds.size,
  };
}

type AccountSelectorContextValue = ReturnType<typeof useAccountSelector>;

const AccountSelectorContext =
  createContext<AccountSelectorContextValue | null>(null);

function useAccountSelectorContext(): AccountSelectorContextValue {
  const context = useContext(AccountSelectorContext);
  if (!context) {
    throw new Error(
      "AccountSelector parts must be used within an <AccountSelector>.",
    );
  }
  return context;
}

/**
 * A searchable, **platform-grouped multi-select** for connected social accounts.
 * The root owns state and the Popover; compose {@link AccountSelectorTrigger} and
 * {@link AccountSelectorContent} inside it, or pass no children for the default
 * dropdown trigger + content. Controlled via `value`/`onValueChange`, or
 * uncontrolled via `defaultValue`.
 */
export function AccountSelector({
  accounts,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: {
  accounts: SocialAccount[];
  children?: ReactNode;
  defaultValue?: string[];
  onValueChange?: (ids: string[]) => void;
  value?: string[];
} & Omit<ComponentProps<typeof Popover>, "children">) {
  const state = useAccountSelector({
    accounts,
    value,
    defaultValue,
    onValueChange,
  });

  return (
    <AccountSelectorContext.Provider value={state}>
      <Popover {...props}>
        {children ?? (
          <>
            <AccountSelectorTrigger />
            <AccountSelectorContent />
          </>
        )}
      </Popover>
    </AccountSelectorContext.Provider>
  );
}

/**
 * The Popover trigger — **a button you own**. Pass any children (an avatar stack, a
 * User Badge row, an "add account" pill) and style with `className`; with no children
 * it renders the default dropdown look (selected count + chevron).
 */
export function AccountSelectorTrigger({
  className,
  children,
  placeholder = "Select accounts",
  ...props
}: {
  placeholder?: string;
} & ComponentProps<typeof PopoverTrigger>) {
  const { count } = useAccountSelectorContext();

  // A custom child brings its own styling — the consumer fully owns the button.
  if (children !== undefined) {
    return (
      <PopoverTrigger
        data-slot="account-selector-trigger"
        className={className}
        {...props}
      >
        {children}
      </PopoverTrigger>
    );
  }

  // Default dropdown look. `cn-control-radius` MUST live in this direct `cn()` string
  // (not a `cond && "…"` conditional) — the build's transformStyle only resolves cn-*
  // in direct className args. It tracks the style's control corner (rounded, sharp in
  // sera/lyra) so the trigger matches the popover/command under the sharp styles.
  return (
    <PopoverTrigger
      data-slot="account-selector-trigger"
      className={cn(
        "rounded-md flex h-9 w-64 items-center justify-between gap-2 border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:opacity-50",
        count === 0 && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span className="truncate">
        {count === 0 ? placeholder : `${count} selected`}
      </span>
      <ChevronsUpDown aria-hidden />
    </PopoverTrigger>
  );
}

/**
 * The Popover panel: a {@link Command} with a search field and the platform-grouped,
 * multi-select account list. `Command` (cmdk) owns filtering + keyboard nav and hides
 * a platform group once all its accounts filter out.
 */
export function AccountSelectorContent({
  className,
  searchPlaceholder = "Search accounts…",
  emptyText = "No accounts found.",
  footer,
  align = "start",
  ...props
}: {
  emptyText?: ReactNode;
  /** Pinned below the list, outside the scroll/filter region — a spot for an
   * action like "Connect account" that stays reachable at any scroll or filter. */
  footer?: ReactNode;
  searchPlaceholder?: string;
} & ComponentProps<typeof PopoverContent>) {
  const { groups, isSelected, toggle } = useAccountSelectorContext();

  return (
    <PopoverContent
      data-slot="account-selector-content"
      align={align}
      className={cn("w-64 p-0", className)}
      {...props}
    >
      <Command>
        <CommandInput placeholder={searchPlaceholder} />
        <CommandList>
          <CommandEmpty>{emptyText}</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup
              key={group.platform}
              data-slot="account-selector-group"
              heading={
                <span className="flex items-center gap-1.5">
                  <BrandMark platform={group.platform} className="size-3.5" />
                  {group.label}
                </span>
              }
            >
              {group.accounts.map((account) => {
                const selected = isSelected(account.id);
                return (
                  <CommandItem
                    key={account.id}
                    value={account.id}
                    keywords={[account.username, accountLabel(account)]}
                    onSelect={() => toggle(account.id)}
                    data-slot="account-selector-option"
                    // Drives CommandItem's own trailing check (flush to the edge, styled
                    // per the active style) — no custom check element needed.
                    data-checked={selected}
                    aria-selected={selected}
                  >
                    <UserAvatar
                      name={accountLabel(account)}
                      src={account.avatarUrl}
                      size="sm"
                      className="size-7"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate leading-tight">
                        {accountLabel(account)}
                      </span>
                      <span className="truncate text-xs leading-tight text-muted-foreground">
                        @{account.username}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
        {footer ? (
          <div
            data-slot="account-selector-footer"
            className="mt-1 border-t border-border pt-1"
          >
            {footer}
          </div>
        ) : null}
      </Command>
    </PopoverContent>
  );
}
