import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type {
  AccountPost,
  SocialAccount,
  SocialAccountStatus,
  SocialAccountTokenMeta,
} from "~/lib/types/social-account";

import { SocialAccountAvatar } from "~/components/social-account-avatar";
import { ArrowLeftIcon } from "~/icons";
import { platformMeta } from "~/lib/platform-meta";
import { Badge } from "~/ui/badge";
import { Copyable } from "~/ui/copyable";
import { Fact } from "~/ui/fact";
import { Separator } from "~/ui/separator";

import { formatDate } from "../utils";
import { AccountDangerZone } from "./account-danger-zone";
import { AccountPostsTable } from "./account-posts-table";
import { AccountTokensSection } from "./account-tokens-section";

const STATUS_BADGE: Record<
  SocialAccountStatus,
  "success-light" | "warning-light" | "secondary"
> = {
  connected: "success-light",
  expired: "warning-light",
  disconnected: "secondary",
};

/** A copyable id (em-dash when absent). */
function IdValue({ value, copyLabel }: { copyLabel: string; value: string | null; }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <Copyable value={value} label={copyLabel} className="max-w-full">
      <span className="truncate font-mono">{value}</span>
    </Copyable>
  );
}

/**
 * Social account detail page body (PFM-693). A focused read-only view: a compact
 * identity header (avatar · username · status · platform), then the tokens card
 * pinned at the top, an identifiers/connected strip (copyable ids — laid out
 * inline rather than in a sparse card), and the card-wrapped danger zone.
 */
export function AccountDetailView({
  account,
  tokenMeta,
  posts,
}: {
  account: SocialAccount;
  posts: AccountPost[];
  tokenMeta: SocialAccountTokenMeta;
}) {
  const { i18n, t } = useTranslation();
  const meta = platformMeta(account.platform);
  const username = account.username ?? account.platformId;

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <Link
        to="/social-accounts"
        className="inline-flex items-center gap-1.5 text-xs/relaxed text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        {t("socialAccounts.detail.back")}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        {/* Left column: header → details → separator → posts. The header lives
            here (not full-width) so the right column (tokens) aligns to the top. */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Identity header — absorbs platform + status (no separate Overview card). */}
          <header className="flex min-w-0 flex-wrap items-center gap-4">
            <SocialAccountAvatar
              account={account}
              size="lg"
              ringClassName="ring-background"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="truncate font-heading text-2xl font-semibold text-foreground">
                {username}
              </h1>
              <span className="text-sm text-muted-foreground">
                {meta?.label ?? account.platform}
              </span>
            </div>
          </header>

          {/* Details — a 2-row × 3-col strip (ids, connected, status), not a card. */}
          <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-3">
            <Fact label={t("socialAccounts.columns.pfmId")}>
              <IdValue
                value={account.id}
                copyLabel={t("socialAccounts.actions.copyPfmId")}
              />
            </Fact>
            <Fact label={t("socialAccounts.columns.platformId")}>
              <IdValue
                value={account.platformId}
                copyLabel={t("socialAccounts.actions.copyPlatformId")}
              />
            </Fact>
            <Fact label={t("socialAccounts.columns.externalId")}>
              <IdValue
                value={account.externalId}
                copyLabel={t("socialAccounts.actions.copyExternalId")}
              />
            </Fact>
            <Fact label={t("socialAccounts.columns.connected")}>
              {account.connectedAt ? formatDate(account.connectedAt, i18n.language) : "—"}
            </Fact>
            <Fact label={t("socialAccounts.detail.statusLabel")}>
              <Badge variant={STATUS_BADGE[account.status]} size="sm">
                {t(`socialAccounts.status.${account.status}`)}
              </Badge>
            </Fact>
          </div>

          <Separator />

          <AccountPostsTable posts={posts} />
        </div>

        {/* Right: tokens + danger zone. */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <AccountTokensSection
            socialAccountId={account.id}
            tokenMeta={tokenMeta}
          />
          <AccountDangerZone account={account} />
        </div>
      </div>
    </div>
  );
}
