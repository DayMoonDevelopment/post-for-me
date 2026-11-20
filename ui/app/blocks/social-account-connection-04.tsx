"use client";

import type { SocialProvider } from "~/lib/post-for-me.types";
import { PLATFORM_LABELS } from "~/lib/post-for-me.utils";
import { PlatformAvatar } from "~/components/platform-avatar";
import { BrandMark } from "~/ui/brand-mark";
import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarIconBadge,
} from "~/components/user-avatar";
import { AvatarGroup, AvatarGroupCount } from "~/ui/avatar";
import { Button } from "~/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from "~/ui/item";

/** One account occupying a platform slot in a set. */
type SetAccount = {
  avatarUrl?: string;
  username: string;
};

/**
 * A social set — a purchased bundle that holds ONE account per platform. The
 * `accounts` map is keyed by platform; a missing key is an empty slot.
 */
type SocialSet = {
  accounts: Partial<Record<SocialProvider, SetAccount>>;
  id: string;
  name: string;
};

// The platforms a set can hold, one slot each. TikTok and TikTok Business are
// separate providers in the API but one network to a user — pick the one your
// app is set up for when you connect.
const ROSTER: SocialProvider[] = [
  "instagram",
  "facebook",
  "x",
  "tiktok",
  "youtube",
  "linkedin",
  "threads",
  "pinterest",
  "bluesky",
];

// Inset rows for the set body: the platform avatar sits outside a bottom rule
// that spans the name → its action.
const ROW = "items-center gap-3 rounded-none border-0 px-0 py-0";
const BODY =
  "flex flex-1 items-center gap-3 border-b border-border py-2.5 " +
  "group-last/item:border-b-0";

// Keep the avatar centered even on rows that render a description: the Item
// primitive top-aligns media whenever a description is present (to line an icon
// up with the title), so counter it with the SAME group-has variant — a plain
// `self-center` is a different variant and wouldn't win.
const MEDIA =
  "self-center " +
  "group-has-data-[slot=item-description]/item:self-center " +
  "group-has-data-[slot=item-description]/item:translate-y-0";

// Sample data — three sets at different levels of completeness.
const SETS: SocialSet[] = [
  {
    id: "set_1",
    name: "Acme Brand",
    accounts: {
      instagram: {
        username: "@acme.shop",
        avatarUrl: "https://i.pravatar.cc/80?img=12",
      },
      x: { username: "@acme", avatarUrl: "https://i.pravatar.cc/80?img=33" },
      tiktok: {
        username: "@acme",
        avatarUrl: "https://i.pravatar.cc/80?img=5",
      },
      linkedin: {
        username: "Acme Inc.",
        avatarUrl: "https://i.pravatar.cc/80?img=47",
      },
      youtube: {
        username: "Acme",
        avatarUrl: "https://i.pravatar.cc/80?img=52",
      },
      facebook: {
        username: "Acme",
        avatarUrl: "https://i.pravatar.cc/80?img=13",
      },
    },
  },
  {
    id: "set_2",
    name: "Client · Beta Co",
    accounts: {
      instagram: {
        username: "@beta.co",
        avatarUrl: "https://i.pravatar.cc/80?img=20",
      },
      x: { username: "@betaco", avatarUrl: "https://i.pravatar.cc/80?img=68" },
      bluesky: {
        username: "beta.bsky.social",
        avatarUrl: "https://i.pravatar.cc/80?img=60",
      },
    },
  },
  {
    id: "set_3",
    name: "Personal",
    accounts: {
      instagram: {
        username: "@jane",
        avatarUrl: "https://i.pravatar.cc/80?img=45",
      },
    },
  },
];

/** Connected platforms in a set, in roster order. */
function filledPlatforms(set: SocialSet): SocialProvider[] {
  return ROSTER.filter((platform) => set.accounts[platform]);
}

/**
 * SOCIAL SETS — cards layout.
 *
 * A "social set" is a purchased bundle that holds one account per platform. This
 * layout shows each set as a card with its name and completeness summary; Manage
 * opens a dialog with the per-platform connect/disconnect rows for that set.
 * Reads well as a dashboard overview when a user owns a handful of sets.
 *
 * The connect flow is the same server handoff as the other blocks — scoped to a
 * `(setId, platform)` so the account lands in the right set.
 */
export function SocialAccountConnection04() {
  // Calls a route on YOUR server. The Post for Me auth-url endpoint needs your
  // API key, which must never reach the browser — derive the set + platform (and
  // external_id) server-side from the authenticated session.
  async function connect(setId: string, platform: SocialProvider) {
    const response = await fetch("/api/social-accounts/auth-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setId, platform }),
    });
    const { url } = await response.json();
    window.location.assign(url);
  }

  async function disconnect(setId: string, platform: SocialProvider) {
    await fetch("/api/social-accounts/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setId, platform }),
    });
  }

  async function createSet() {
    await fetch("/api/social-sets", { method: "POST" });
  }

  return (
    <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
      {SETS.map((set) => {
        const filled = filledPlatforms(set);
        return (
          <Card key={set.id}>
            <CardHeader>
              <CardTitle>{set.name}</CardTitle>
              <CardDescription>
                {filled.length}/{ROSTER.length} connected
              </CardDescription>
              <CardAction>
                <ManageSetDialog
                  set={set}
                  onConnect={connect}
                  onDisconnect={disconnect}
                />
              </CardAction>
            </CardHeader>
            <CardContent>
              {filled.length > 0 ? (
                <AvatarGroup>
                  {filled.slice(0, 6).map((platform) => {
                    const account = set.accounts[platform]!;
                    return (
                      <UserAvatar
                        key={platform}
                        name={account.username}
                        src={account.avatarUrl}
                        size="sm"
                      />
                    );
                  })}
                  {filled.length > 6 ? (
                    <AvatarGroupCount>+{filled.length - 6}</AvatarGroupCount>
                  ) : null}
                </AvatarGroup>
              ) : (
                <span className="text-xs text-muted-foreground">
                  No accounts connected yet
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add-a-set affordance. Built on Card so its corner radius tracks the
          installed style alongside the set cards; the button fills it and
          inherits that radius for a clean hover fill. */}
      <Card className="border border-dashed border-border bg-transparent py-0 ring-0">
        <button
          type="button"
          onClick={createSet}
          className="flex min-h-24 flex-1 items-center justify-center rounded-[inherit] text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          + New set
        </button>
      </Card>
    </div>
  );
}

/** The card's Manage action: a dialog with the set's per-platform rows. */
function ManageSetDialog({
  set,
  onConnect,
  onDisconnect,
}: {
  onConnect: (setId: string, platform: SocialProvider) => void;
  onDisconnect: (setId: string, platform: SocialProvider) => void;
  set: SocialSet;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm">
            Manage
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{set.name}</DialogTitle>
        </DialogHeader>
        <SetBody set={set} onConnect={onConnect} onDisconnect={onDisconnect} />
      </DialogContent>
    </Dialog>
  );
}

/** The per-platform rows for one set: connect an empty slot, disconnect a filled one. */
function SetBody({
  set,
  onConnect,
  onDisconnect,
}: {
  onConnect: (setId: string, platform: SocialProvider) => void;
  onDisconnect: (setId: string, platform: SocialProvider) => void;
  set: SocialSet;
}) {
  return (
    <ItemGroup className="max-h-80 gap-0 overflow-y-auto">
      {ROSTER.map((platform) => {
        const account = set.accounts[platform];
        return (
          <Item key={platform} className={ROW}>
            <ItemMedia className={MEDIA}>
              {account ? (
                <UserAvatar
                  name={account.username}
                  src={account.avatarUrl}
                  size="default"
                >
                  <UserAvatarBadge placement="default">
                    <UserAvatarIconBadge>
                      <BrandMark platform={platform} />
                    </UserAvatarIconBadge>
                  </UserAvatarBadge>
                </UserAvatar>
              ) : (
                <PlatformAvatar platform={platform} size="default" />
              )}
            </ItemMedia>
            <div className={BODY}>
              <ItemContent className="gap-0.5">
                <ItemTitle>{PLATFORM_LABELS[platform]}</ItemTitle>
                {account ? (
                  <ItemDescription>{account.username}</ItemDescription>
                ) : null}
              </ItemContent>
              <ItemActions>
                {account ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDisconnect(set.id, platform)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onConnect(set.id, platform)}
                  >
                    Connect
                  </Button>
                )}
              </ItemActions>
            </div>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
