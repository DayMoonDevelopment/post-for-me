import { useState } from "react";

import {
  AccountSelector,
  AccountSelectorContent,
  AccountSelectorTrigger,
} from "~/components/account-selector";
import type { SocialAccount } from "~/lib/post-for-me.types";
import { IconPlaceholder } from "~/ui/icon-placeholder";

const ACCOUNTS: SocialAccount[] = [
  { id: "ig-jane", platform: "instagram", username: "janedoe", displayName: "Jane Doe" },
  { id: "ig-pfm", platform: "instagram", username: "postforme", displayName: "Post for Me" },
  { id: "x-marcus", platform: "x", username: "marcuslee", displayName: "Marcus Lee" },
  { id: "x-pfm", platform: "x", username: "postforme", displayName: "Post for Me" },
  { id: "tt-hub", platform: "tiktok", username: "creatorhub", displayName: "Creator Hub" },
  { id: "yt-pfm", platform: "youtube", username: "postforme", displayName: "Post for Me" },
  { id: "li-jane", platform: "linkedin", username: "jane-doe", displayName: "Jane Doe" },
  { id: "bs-pfm", platform: "bluesky", username: "postforme.bsky", displayName: "Post for Me" },
];

export function AccountSelectorPreview() {
  const [value, setValue] = useState<string[]>(["ig-jane", "x-marcus"]);
  return (
    <AccountSelector accounts={ACCOUNTS} value={value} onValueChange={setValue} />
  );
}

export function AccountSelectorCustomTrigger() {
  const [value, setValue] = useState<string[]>([]);
  return (
    <AccountSelector accounts={ACCOUNTS} value={value} onValueChange={setValue}>
      {/* The trigger is a button you fully own — here a compact "add" pill instead
          of the default dropdown. */}
      <AccountSelectorTrigger className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <IconPlaceholder
          lucide="Plus"
          tabler="IconPlus"
          phosphor="Plus"
          hugeicons="PlusSignIcon"
          remixicon="RiAddLine"
          className="size-4"
          aria-hidden
        />
        {value.length === 0 ? "Add accounts" : `${value.length} selected`}
      </AccountSelectorTrigger>
      <AccountSelectorContent />
    </AccountSelector>
  );
}
