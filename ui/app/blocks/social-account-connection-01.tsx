"use client";

import type { SocialProvider } from "~/lib/post-for-me.types";
import { PLATFORM_LABELS } from "~/lib/post-for-me.utils";
import { PlatformAvatar } from "~/components/platform-avatar";
import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarIconBadge,
  UserAvatarStatusBadge,
} from "~/components/user-avatar";
import { BrandMark } from "~/ui/brand-mark";
import { Button } from "~/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { IconPlaceholder } from "~/ui/icon-placeholder";
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

/**
 * One account slot: a platform, plus the account occupying it if there is one.
 * `null` means nothing is connected yet.
 */
type AccountSlot = {
  account: {
    avatarUrl?: string;
    /** `error` = the connection broke (revoked access, expired token). */
    status: "connected" | "error";
    username: string;
  } | null;
  platform: SocialProvider;
};

// Condensed rows with an INSET underline. The rule belongs to ONE element that
// spans the text AND the action — a single unbroken line — while the avatar sits
// outside it, so the line starts at the text the way native list rows read.
const ROWS = "gap-0";
const ROW = "items-center gap-3 rounded-none border-0 px-0 py-0";
// The avatar column, centered on the row. The Item primitive top-aligns its
// media WHENEVER a description is present (`…/item:self-start` + a nudge) so an
// icon lines up with the title — right for an icon, wrong for an avatar. Override
// with the SAME group-has variant so tailwind-merge actually beats it (a plain
// `self-center` is a different variant and wouldn't).
const MEDIA =
  "self-center " +
  "group-has-data-[slot=item-description]/item:self-center " +
  "group-has-data-[slot=item-description]/item:translate-y-0";
// The bordered body. `last:border-b-0` keeps the list from ending on a line.
const BODY =
  "flex flex-1 items-center gap-3 border-b border-border py-2.5 " +
  "group-last/item:border-b-0";
// Tighten title↔description (the primitive ships gap-1).
const TEXT = "gap-0";

// The platforms this app offers, one slot each. TikTok and TikTok Business are
// separate providers in the API but the same network to a user, so they're
// consolidated into a single choice here — pick the one your app is set up for
// when you request the auth URL.
const SLOTS: AccountSlot[] = [
  {
    platform: "instagram",
    account: {
      username: "@acme.shop",
      status: "connected",
      avatarUrl: "https://i.pravatar.cc/80?img=12",
    },
  },
  { platform: "facebook", account: null },
  {
    platform: "x",
    account: {
      username: "@acme",
      status: "connected",
      avatarUrl: "https://i.pravatar.cc/80?img=33",
    },
  },
  {
    platform: "tiktok",
    account: {
      username: "@acme",
      status: "error",
      avatarUrl: "https://i.pravatar.cc/80?img=5",
    },
  },
  { platform: "youtube", account: null },
  {
    platform: "linkedin",
    account: {
      username: "Acme Inc.",
      status: "connected",
      avatarUrl: "https://i.pravatar.cc/80?img=47",
    },
  },
  { platform: "threads", account: null },
  { platform: "pinterest", account: null },
  {
    platform: "bluesky",
    account: {
      username: "acme.bsky.social",
      status: "error",
      avatarUrl: "https://i.pravatar.cc/80?img=60",
    },
  },
];

/**
 * ONE ACCOUNT PER PLATFORM — the "social set" model.
 *
 * Each platform is a single slot the user fills: connect it, manage it,
 * disconnect it. A connected slot shows whose account it is; a broken one says
 * so and offers to reconnect.
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
 *      app — re-fetch `socialAccounts.list()` there to refresh these slots.
 *
 * Some platforms need input BEFORE step 1: Instagram picks a `connection_type`
 * (Instagram or Facebook login), LinkedIn picks personal or organization, and
 * Bluesky takes a handle plus an app password instead of a redirect. Collect
 * those first and pass them as `platform_data`.
 */
export function SocialAccountConnection01() {
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

  async function disconnect(platform: SocialProvider) {
    // Your route calls `socialAccounts.disconnect(id)`, then refresh the list.
    await fetch("/api/social-accounts/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
  }

  return (
    <ItemGroup className={ROWS}>
      {SLOTS.map((slot) => (
        <Item key={slot.platform} className={ROW}>
          <ItemMedia className={MEDIA}>
            {slot.account ? (
              // Connected: whose account it is comes first, with the platform
              // notched on the corner and — when broken — a status dot.
              <UserAvatar
                name={slot.account.username}
                src={slot.account.avatarUrl}
              >
                <UserAvatarBadge placement="default">
                  <UserAvatarIconBadge>
                    <BrandMark platform={slot.platform} />
                  </UserAvatarIconBadge>
                </UserAvatarBadge>
                {slot.account.status === "error" ? (
                  <UserAvatarBadge placement="secondary">
                    <UserAvatarStatusBadge>
                      <StatusIndicator status="destructive" />
                    </UserAvatarStatusBadge>
                  </UserAvatarBadge>
                ) : null}
              </UserAvatar>
            ) : (
              // Empty slot: the platform is the identity.
              <PlatformAvatar platform={slot.platform} />
            )}
          </ItemMedia>

          {/* One bordered body spanning text → action, so the underline is a
              single unbroken rule; the avatar sits outside it. */}
          <div className={BODY}>
            <ItemContent className={TEXT}>
              <ItemTitle>{PLATFORM_LABELS[slot.platform]}</ItemTitle>
              {slot.account ? (
                <ItemDescription>
                  {slot.account.status === "error"
                    ? `${slot.account.username} · Reconnect needed`
                    : slot.account.username}
                </ItemDescription>
              ) : null}
            </ItemContent>

            <ItemActions>
              {slot.account ? (
                <ManageDialog
                  slot={slot}
                  onDisconnect={() => disconnect(slot.platform)}
                  onReconnect={() => connect(slot.platform)}
                />
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => connect(slot.platform)}
                >
                  Connect account
                </Button>
              )}
            </ItemActions>
          </div>
        </Item>
      ))}
    </ItemGroup>
  );
}

/**
 * The connected slot's dialog: who's connected, and the ways out of it. Centered,
 * with the actions in a row. A healthy connection just shows the account; a broken
 * one explains itself and offers to reconnect (the likelier intent, so it's the
 * primary action).
 */
function ManageDialog({
  slot,
  onDisconnect,
  onReconnect,
}: {
  onDisconnect: () => void;
  onReconnect: () => void;
  slot: AccountSlot;
}) {
  const account = slot.account;
  if (!account) return null;
  const label = PLATFORM_LABELS[slot.platform];
  const broken = account.status === "error";

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm">
            {/* A broken connection flags itself right on the row's action. */}
            {broken ? <WarningIcon className="text-destructive" /> : null}
            Manage
          </Button>
        }
      />
      <DialogContent className="sm:max-w-xs">
        <div className="flex flex-col items-center gap-3 text-center">
          <UserAvatar
            name={account.username}
            src={account.avatarUrl}
            size="lg"
            className="size-16!"
          >
            <UserAvatarBadge placement="default">
              <UserAvatarIconBadge>
                <BrandMark platform={slot.platform} />
              </UserAvatarIconBadge>
            </UserAvatarBadge>
            {broken ? (
              <UserAvatarBadge placement="secondary">
                <UserAvatarStatusBadge>
                  <StatusIndicator status="destructive" />
                </UserAvatarStatusBadge>
              </UserAvatarBadge>
            ) : null}
          </UserAvatar>
          <div className="flex flex-col gap-1.5">
            <DialogTitle>{account.username}</DialogTitle>
            {/* Only a broken connection needs words — a healthy one speaks for
                itself. */}
            {broken ? (
              <DialogDescription>
                {`This ${label} connection stopped working — the account may have revoked access or its token expired. Reconnect to keep posting.`}
              </DialogDescription>
            ) : null}
          </div>
        </div>

        {/* Full-width actions in a row — each stretches to fill so they read as
            one balanced control. Broken → Disconnect + Reconnect fill the row;
            healthy → Cancel is kept only to partner the lone Disconnect. */}
        <div className="flex flex-row gap-2">
          {!broken ? (
            <DialogClose
              render={
                <Button type="button" variant="ghost" className="flex-1">
                  Cancel
                </Button>
              }
            />
          ) : null}
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={onDisconnect}
          >
            {broken ? "Disconnect" : "Disconnect account"}
          </Button>
          {broken ? (
            <Button type="button" className="flex-1" onClick={onReconnect}>
              Reconnect
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
