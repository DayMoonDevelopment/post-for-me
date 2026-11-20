"use client";

import type { SocialProvider } from "~/lib/post-for-me.types";
import { PLATFORM_LABELS } from "~/lib/post-for-me.utils";
import { PlatformAvatar } from "~/components/platform-avatar";
import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarStatusBadge,
} from "~/components/user-avatar";
import { AvatarGroup, AvatarGroupCount } from "~/ui/avatar";
import { BrandMark } from "~/ui/brand-mark";
import { Button } from "~/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from "~/ui/item";
import { StatusIndicator } from "~/ui/status-indicator";

/** A "needs attention" glyph for a broken connection — a circle-alert available
 * across every icon library the registry supports. */
function WarningIcon({ className }: { className?: string }) {
  return (
    <IconPlaceholder
      lucide="CircleAlert"
      tabler="IconAlertCircle"
      phosphor="WarningCircle"
      hugeicons="AlertCircleIcon"
      remixicon="RiErrorWarningLine"
      className={className}
      aria-hidden
    />
  );
}

/** One connected account on a platform. */
type ConnectedAccount = {
  avatarUrl?: string;
  id: string;
  /** `error` = the connection broke (revoked access, expired token). */
  status: "connected" | "error";
  username: string;
};

/** A platform and the accounts connected on it — empty = nothing connected. */
type PlatformRow = {
  accounts: ConnectedAccount[];
  platform: SocialProvider;
};

// How many account avatars to show in a row before collapsing into a +N.
const MAX_AVATARS = 4;

// Condensed rows with an INSET underline. The rule belongs to ONE element that
// spans the text AND the action — a single unbroken line — while the platform
// avatar sits outside it, so the line starts at the text.
const ROWS = "gap-0";
const ROW = "items-center gap-3 rounded-none border-0 px-0 py-0";
// Keep the avatar centered on the row. The Item primitive top-aligns its media
// whenever a description is present (to line an icon up with the title) — right
// for an icon, wrong for an avatar — so counter it with the SAME group-has
// variant, which tailwind-merge can then beat.
const MEDIA =
  "self-center " +
  "group-has-data-[slot=item-description]/item:self-center " +
  "group-has-data-[slot=item-description]/item:translate-y-0";
// The bordered body. `last:border-b-0` keeps the list from ending on a line.
const BODY =
  "flex flex-1 items-center gap-3 border-b border-border py-2.5 " +
  "group-last/item:border-b-0";
// Title above the avatar group.
const TEXT = "gap-1.5";

// Sample data — some platforms with several accounts, some with one, some empty.
// TikTok and TikTok Business are separate providers in the API but the same
// network to a user; pick the one your app is set up for when you connect.
const PLATFORMS: PlatformRow[] = [
  {
    platform: "instagram",
    accounts: [
      {
        id: "ig_1",
        username: "@acme.shop",
        status: "connected",
        avatarUrl: "https://i.pravatar.cc/80?img=12",
      },
      {
        id: "ig_2",
        username: "@acme.eu",
        status: "error",
        avatarUrl: "https://i.pravatar.cc/80?img=32",
      },
    ],
  },
  { platform: "facebook", accounts: [] },
  {
    platform: "x",
    accounts: [
      {
        id: "x_1",
        username: "@acme",
        status: "connected",
        avatarUrl: "https://i.pravatar.cc/80?img=33",
      },
    ],
  },
  {
    platform: "tiktok",
    accounts: [
      {
        id: "tt_1",
        username: "@acme",
        status: "connected",
        avatarUrl: "https://i.pravatar.cc/80?img=5",
      },
      {
        id: "tt_2",
        username: "@acme.creators",
        status: "connected",
        avatarUrl: "https://i.pravatar.cc/80?img=15",
      },
      {
        id: "tt_3",
        username: "@acme.jp",
        status: "error",
        avatarUrl: "https://i.pravatar.cc/80?img=25",
      },
    ],
  },
  { platform: "youtube", accounts: [] },
  {
    platform: "linkedin",
    accounts: [
      {
        id: "li_1",
        username: "Acme Inc.",
        status: "connected",
        avatarUrl: "https://i.pravatar.cc/80?img=47",
      },
    ],
  },
  { platform: "threads", accounts: [] },
  { platform: "pinterest", accounts: [] },
  {
    platform: "bluesky",
    accounts: [
      {
        id: "bs_1",
        username: "acme.bsky.social",
        status: "error",
        avatarUrl: "https://i.pravatar.cc/80?img=60",
      },
    ],
  },
];

/**
 * MULTIPLE ACCOUNTS PER PLATFORM.
 *
 * Each platform can hold several connected accounts. The row leads with the
 * platform, and its description is an avatar group of who's connected; Manage
 * opens a dialog listing every account with a disconnect on each, plus a way to
 * connect another. Best for products where a person or team runs multiple
 * presences on the same network.
 *
 * Connecting is a two-step handoff you wire up:
 *
 *   1. Ask YOUR server for an auth URL. The Post for Me endpoint
 *      (`POST /v1/social-accounts/auth-url`) authenticates with your API key,
 *      which is a server credential — it must never reach the browser. So the
 *      handlers below should hit a route on your own server, and that route
 *      calls Post for Me. Have it derive `external_id` from the signed-in
 *      session rather than trusting anything sent from the client.
 *   2. Send the browser to the `url` that comes back. The user signs in on the
 *      platform, Post for Me stores the connection, and they land back on your
 *      app — re-fetch `socialAccounts.list()` there to refresh these rows.
 *
 * Some platforms need input BEFORE step 1: Instagram picks a `connection_type`
 * (Instagram or Facebook login), LinkedIn picks personal or organization, and
 * Bluesky takes a handle plus an app password instead of a redirect. Collect
 * those first and pass them as `platform_data`.
 */
export function SocialAccountConnection02() {
  async function connect(platform: SocialProvider) {
    // Replace with a call to your own route — see the note above.
    const response = await fetch("/api/social-accounts/auth-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const { url } = await response.json();
    window.location.assign(url);
  }

  async function disconnect(accountId: string) {
    // Your route calls `socialAccounts.disconnect(id)`, then refresh the list.
    await fetch("/api/social-accounts/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
  }

  return (
    <ItemGroup className={ROWS}>
      {PLATFORMS.map((row) => {
        const connected = row.accounts.length > 0;
        return (
          <Item key={row.platform} className={ROW}>
            <ItemMedia className={MEDIA}>
              <PlatformAvatar platform={row.platform} />
            </ItemMedia>

            {/* One bordered body spanning text → action; the platform avatar
                sits outside it. */}
            <div className={BODY}>
              <ItemContent className={TEXT}>
                <ItemTitle>{PLATFORM_LABELS[row.platform]}</ItemTitle>
                {/* Connected accounts as an overlapping group; broken ones carry
                    a red dot. An empty platform shows just its name — the Connect
                    button says the rest. (No ItemDescription here: it would make
                    the primitive top-align the platform avatar.) */}
                {connected ? (
                  <AvatarGroup>
                    {row.accounts.slice(0, MAX_AVATARS).map((account) => (
                      <UserAvatar
                        key={account.id}
                        name={account.username}
                        src={account.avatarUrl}
                        size="sm"
                      >
                        {account.status === "error" ? (
                          <UserAvatarBadge placement="default">
                            <UserAvatarStatusBadge>
                              <StatusIndicator status="destructive" />
                            </UserAvatarStatusBadge>
                          </UserAvatarBadge>
                        ) : null}
                      </UserAvatar>
                    ))}
                    {row.accounts.length > MAX_AVATARS ? (
                      <AvatarGroupCount>
                        +{row.accounts.length - MAX_AVATARS}
                      </AvatarGroupCount>
                    ) : null}
                  </AvatarGroup>
                ) : null}
              </ItemContent>

              <ItemActions>
                {connected ? (
                  <ManageDialog
                    platform={row.platform}
                    accounts={row.accounts}
                    onConnect={() => connect(row.platform)}
                    onDisconnect={disconnect}
                  />
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => connect(row.platform)}
                  >
                    Connect account
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

/**
 * The manage dialog for one platform: a list of every connected account with a
 * disconnect on each, and a primary "connect another" action. A broken account
 * shows a status dot + a reconnect.
 */
function ManageDialog({
  platform,
  accounts,
  onConnect,
  onDisconnect,
}: {
  accounts: ConnectedAccount[];
  onConnect: () => void;
  onDisconnect: (accountId: string) => void;
  platform: SocialProvider;
}) {
  const label = PLATFORM_LABELS[platform];
  // Surface a broken account on the platform's row action, before it's opened.
  const hasError = accounts.some((account) => account.status === "error");

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm">
            {hasError ? <WarningIcon className="text-destructive" /> : null}
            Manage
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="gap-2">
          {/* Platform brand mark on the top leading edge, above the name. */}
          <BrandMark platform={platform} className="size-8" />
          <div className="flex flex-row items-baseline gap-1.5">
            <DialogTitle>{label}</DialogTitle>
            <span aria-hidden className="text-muted-foreground">
              •
            </span>
            <DialogDescription>
              {`${accounts.length} account${accounts.length === 1 ? "" : "s"} connected`}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Same inset bottom-border rows as the platform list: the avatar sits
            outside the rule, which spans the account name → its actions. The one
            scroll region if a platform has many accounts. */}
        <ItemGroup className={`${ROWS} max-h-64 overflow-y-auto`}>
          {accounts.map((account) => {
            const broken = account.status === "error";
            return (
              <Item key={account.id} className={ROW}>
                <ItemMedia className={MEDIA}>
                  <UserAvatar
                    name={account.username}
                    src={account.avatarUrl}
                    size="sm"
                  >
                    {broken ? (
                      <UserAvatarBadge placement="default">
                        <UserAvatarStatusBadge>
                          <StatusIndicator status="destructive" />
                        </UserAvatarStatusBadge>
                      </UserAvatarBadge>
                    ) : null}
                  </UserAvatar>
                </ItemMedia>
                <div className={BODY}>
                  <ItemContent className="gap-0">
                    <ItemTitle>{account.username}</ItemTitle>
                    {broken ? (
                      <ItemDescription className="text-destructive">
                        Reconnect needed
                      </ItemDescription>
                    ) : null}
                  </ItemContent>
                  <ItemActions>
                    {broken ? (
                      <Button type="button" size="sm" onClick={onConnect}>
                        Reconnect
                      </Button>
                    ) : null}
                    {/* Disconnect is the destructive, less-common action, so it
                        lives behind a kebab menu rather than a bare button. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`More options for ${account.username}`}
                          >
                            <IconPlaceholder
                              lucide="EllipsisVertical"
                              tabler="IconDotsVertical"
                              phosphor="DotsThreeVertical"
                              hugeicons="MoreVerticalIcon"
                              remixicon="RiMore2Line"
                              aria-hidden
                            />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        {/* Colored destructive explicitly: this dropdown's glassy
                            content neutralizes the `variant="destructive"` color,
                            so set the red directly (and keep it red on focus). */}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDisconnect(account.id)}
                        >
                          Disconnect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ItemActions>
                </div>
              </Item>
            );
          })}
        </ItemGroup>

        <div className="flex flex-row gap-2">
          <DialogClose
            render={
              <Button type="button" variant="ghost" className="flex-1">
                Done
              </Button>
            }
          />
          <Button type="button" className="flex-1" onClick={onConnect}>
            Connect another
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
