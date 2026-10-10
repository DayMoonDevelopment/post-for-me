import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type {
  PostAccountResult,
  PostAccountStatus,
} from "~/lib/types/social-post";

import { PostAccountAvatar } from "~/components/account-avatars";
import { ChevronRightIcon, ExternalLinkIcon } from "~/icons";
import { platformMeta } from "~/lib/platform-meta";
import { cn } from "~/lib/utils";
import { StatusIndicator, type StatusName } from "~/ui/status-indicator";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

import { CustomConfigList } from "./account-overrides";

const STATUS_TEXT_CLASS: Record<PostAccountStatus, string> = {
  pending: "text-muted-foreground",
  success: "text-success",
  error: "text-destructive",
};

const STATUS_DOT: Record<PostAccountStatus, StatusName> = {
  pending: "default",
  success: "success",
  error: "destructive",
};

/** The identity cell: avatar + label, and a link out to the result page. */
export function AccountIdentityCell({
  result,
}: {
  result: PostAccountResult;
}) {
  const { t } = useTranslation();
  const { account, status, resultId } = result;
  const meta = platformMeta(account.platform);
  const label = account.username ?? meta?.label ?? account.platform;
  const resultHref = resultId ? `/social-post-results/${resultId}` : null;

  return (
    <div className="flex items-center gap-2.5">
      <PostAccountAvatar account={account} status={status} size="sm" />
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{label}</span>
        {resultHref ? (
          <Link
            to={resultHref}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-primary hover:underline"
          >
            {t("socialPosts.detail.viewDetails")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** The status cell: a dot, plus the error message behind a tooltip when failed. */
export function AccountStatusCell({
  result,
}: {
  result: PostAccountResult;
}) {
  const { t } = useTranslation();
  const { status, errorMessage } = result;

  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusIndicator status={STATUS_DOT[status]} className="size-2" />
      {status === "error" && errorMessage ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "cursor-help font-medium underline decoration-dotted decoration-destructive/50 underline-offset-2",
                  STATUS_TEXT_CLASS[status],
                )}
              >
                {t("socialPosts.detail.accountStatus.error")}
              </button>
            }
          />
          <TooltipContent className="max-w-xs whitespace-normal">
            {errorMessage}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className={cn("font-medium", STATUS_TEXT_CLASS[status])}>
          {t(`socialPosts.detail.accountStatus.${status}`)}
        </span>
      )}
    </span>
  );
}

/** The provider post URL cell, or an em dash when the post never landed. */
export function AccountPostUrlCell({
  result,
}: {
  result: PostAccountResult;
}) {
  const { providerPostUrl } = result;

  if (!providerPostUrl) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <a
      href={providerPostUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
    >
      <span className="max-w-[28ch] truncate">{providerPostUrl}</span>
      <ExternalLinkIcon className="size-3.5 shrink-0" />
    </a>
  );
}

/**
 * The attached sub-row for an account whose resolved config diverges from the
 * global base: a caret toggling the collapsible "custom configuration" list.
 *
 * This rides in the grid's expanded-row slot (`meta.expandedContent`). Rows
 * with overrides are held open by the grid so the labelled caret bar is always
 * visible — the caret toggles only the list beneath it, which is the behaviour
 * this table had as hand-written `<tbody>` markup.
 *
 * Memoized: each panel owns its own expand state, so isolating it keeps a
 * toggle (or any sibling's) from re-rendering the rest of the table.
 */
export const AccountOverridesPanel = memo(function AccountOverridesPanel({
  result,
}: {
  result: PostAccountResult;
}) {
  const { t } = useTranslation();
  const { account, overrides } = result;
  const [expanded, setExpanded] = useState(false);
  const toggleLabel = t(
    expanded
      ? "socialPosts.detail.customConfigHide"
      : "socialPosts.detail.customConfigShow",
  );

  return (
    // The grid's expanded cell carries no padding of its own, so the surface
    // and insets that used to live on the `<td>` live here instead.
    <div className="bg-muted/30 px-4 pt-3.5 pb-3">
      <div className="flex flex-col gap-3 ps-2">
        {/* The caret is the expand control; the label stays visible. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="flex items-center gap-1.5 self-start text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRightIcon
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />
          <span className="text-[0.6875rem] font-medium tracking-wide uppercase">
            {t("socialPosts.detail.customConfigTitle")}
          </span>
        </button>

        {expanded ? (
          <CustomConfigList overrides={overrides} platform={account.platform} />
        ) : null}
      </div>
    </div>
  );
});
