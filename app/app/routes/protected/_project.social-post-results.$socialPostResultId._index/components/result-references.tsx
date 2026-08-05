import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type { SocialPostResultDetail } from "~/lib/types/social-post-result";

import { CopyableId } from "~/components/copyable-id";
import { ReferenceRow } from "~/components/reference-row";
import { ExternalLinkIcon, InfoIcon } from "~/icons";
import { Alert, AlertDescription } from "~/ui/alert";
import { LocaleDateTime } from "~/ui/date-time";

/**
 * The result's references card (post back-link + ids + created date) and, for a
 * successful result, the processing notice beneath it. Sticky side column.
 */
export function ResultReferences({
  result,
}: {
  result: SocialPostResultDetail;
}) {
  const { t } = useTranslation();
  const { account, status } = result;

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          {t("socialPostResults.referencesTitle")}
        </h2>
        <dl className="flex flex-col gap-3">
          <ReferenceRow label={t("socialPostResults.columns.post")}>
            <Link
              to={`/social-posts/${result.postId}`}
              className="font-mono text-xs break-all text-primary hover:underline"
            >
              {result.postId}
            </Link>
          </ReferenceRow>
          <ReferenceRow label={t("socialPostResults.columns.resultId")}>
            <CopyableId
              value={result.id}
              copyLabel={t("socialPosts.detail.copyResultId")}
              className="break-all"
            />
          </ReferenceRow>
          <ReferenceRow label={t("socialPostResults.columns.accountId")}>
            <CopyableId
              value={account.id}
              copyLabel={t("socialPosts.detail.copyAccountId")}
              className="break-all"
            />
          </ReferenceRow>
          <ReferenceRow label={t("socialPostResults.columns.platformPostId")}>
            <CopyableId
              value={result.providerPostId}
              copyLabel={t("socialPosts.detail.copyProviderPostId")}
              className="break-all"
            />
          </ReferenceRow>
          <ReferenceRow label={t("socialPostResults.columns.url")}>
            {result.providerPostUrl ? (
              <a
                href={result.providerPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs break-all text-primary hover:underline"
              >
                <span className="min-w-0 break-all">
                  {result.providerPostUrl}
                </span>
                <ExternalLinkIcon className="size-3.5 shrink-0" />
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </ReferenceRow>
          <ReferenceRow label={t("socialPostResults.columns.created")}>
            <LocaleDateTime value={result.createdAt} />
          </ReferenceRow>
        </dl>
      </div>

      {status === "success" ? (
        <Alert variant="info">
          <InfoIcon />
          <AlertDescription>
            {t("socialPosts.detail.processingNotice")}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
