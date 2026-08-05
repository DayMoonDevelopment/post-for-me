import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import type {
  PostAccountResult,
  PostAccountStatus,
} from "~/lib/types/social-post";

import { PostAccountAvatar } from "~/components/account-avatars";
import { CopyableId } from "~/components/copyable-id";
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

const TABLE_COLUMNS = 6;

/**
 * One account as a grouped `<tbody>`: the identity + status + legacy identifier
 * cells, and — when the account's resolved config diverges from the global base —
 * a caret toggling an attached, collapsible "custom configuration" sub-row. The
 * row navigates to its standalone result page when one exists.
 *
 * Memoized: each row owns its own expand state, so isolating it keeps a toggle
 * (or any sibling's) from re-rendering the rest of the table.
 */
export const AccountRow = memo(function AccountRow({
  result,
}: {
  result: PostAccountResult;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    account,
    status,
    resultId,
    providerPostId,
    providerPostUrl,
    overrides,
    errorMessage,
  } = result;
  const meta = platformMeta(account.platform);
  const label = account.username ?? meta?.label ?? account.platform;
  const hasOverrides = overrides.length > 0;
  const [expanded, setExpanded] = useState(false);
  const toggleLabel = t(
    expanded
      ? "socialPosts.detail.customConfigHide"
      : "socialPosts.detail.customConfigShow",
  );
  const resultHref = resultId ? `/social-post-results/${resultId}` : null;

  return (
    <tbody className="border-b border-border last:border-b-0">
      <tr
        onClick={resultHref ? () => navigate(resultHref) : undefined}
        className={cn(
          "[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle [&>td]:whitespace-nowrap",
          resultHref && "cursor-pointer transition-colors hover:bg-muted/40",
        )}
      >
        <td>
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
        </td>
        <td>
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
        </td>
        <td>
          <CopyableId
            value={resultId}
            copyLabel={t("socialPosts.detail.copyResultId")}
          />
        </td>
        <td>
          <CopyableId
            value={account.id}
            copyLabel={t("socialPosts.detail.copyAccountId")}
          />
        </td>
        <td>
          <CopyableId
            value={providerPostId}
            copyLabel={t("socialPosts.detail.copyProviderPostId")}
          />
        </td>
        <td>
          {providerPostUrl ? (
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
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      </tr>

      {hasOverrides ? (
        <tr>
          <td colSpan={TABLE_COLUMNS} className="bg-muted/30 px-4 pt-3.5 pb-3">
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
                <CustomConfigList
                  overrides={overrides}
                  platform={account.platform}
                />
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </tbody>
  );
});
