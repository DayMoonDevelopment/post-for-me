import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type { PostAccountStatus } from "~/lib/types/social-post";
import type { SocialPostResultDetail } from "~/lib/types/social-post-result";

import { PostAccountAvatar } from "~/components/account-avatars";
import { AlertCircleIcon, ArrowLeftIcon } from "~/icons";
import { platformMeta } from "~/lib/platform-meta";
import { Alert, AlertDescription } from "~/ui/alert";
import { Badge } from "~/ui/badge";
import { Separator } from "~/ui/separator";

import { ResolvedConfig } from "./resolved-config";
import { ResultLogs } from "./result-logs";
import { ResultReferences } from "./result-references";

const STATUS_BADGE: Record<
  PostAccountStatus,
  "success-light" | "destructive-light" | "secondary"
> = {
  success: "success-light",
  error: "destructive-light",
  pending: "secondary",
};

/**
 * Result detail page body — one post's outcome for a single account: the account
 * identity + status, an error callout on failure, the {@link ResolvedConfig}
 * (cascade collapsed), the {@link ResultLogs}, and a sticky {@link ResultReferences}
 * aside (ids + the back link to the owning post).
 */
export function ResultDetailView({ result }: { result: SocialPostResultDetail }) {
  const { t } = useTranslation();
  const { account, status } = result;
  const meta = platformMeta(account.platform);
  const handle = account.username ?? meta?.label ?? account.platform;

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <Link
        to={`/social-posts/${result.postId}`}
        className="inline-flex items-center gap-1.5 text-xs/relaxed text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        {t("socialPostResults.back")}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Primary column: identity, resolved config, logs. */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <header className="flex min-w-0 items-center gap-3">
            <PostAccountAvatar account={account} status={status} size="lg" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
                {t("socialPostResults.title")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold text-foreground">
                  {handle}
                </h1>
                <Badge variant={STATUS_BADGE[status]} size="sm">
                  {t(`socialPosts.detail.accountStatus.${status}`)}
                </Badge>
              </div>
            </div>
          </header>

          {status === "error" && result.errorMessage ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{result.errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Separator />

          <ResolvedConfig
            resolved={result.resolved}
            platform={account.platform}
          />

          <Separator />

          <ResultLogs
            details={result.details}
            askLlm={
              status === "error"
                ? { errorMessage: result.errorMessage }
                : undefined
            }
          />
        </div>

        <aside className="lg:col-span-2">
          <ResultReferences result={result} />
        </aside>
      </div>
    </div>
  );
}
