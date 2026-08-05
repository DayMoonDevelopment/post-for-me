import { useTranslation } from "react-i18next";

import type { SocialPostDetail } from "~/lib/types/social-post";

import { CopyableId } from "~/components/copyable-id";
import { ReferenceRow } from "~/components/reference-row";
import { InfoIcon } from "~/icons";
import { Alert, AlertDescription } from "~/ui/alert";
import { LocaleDateTime } from "~/ui/date-time";

/**
 * The post's references card (ids + created date) and, for a processed post, a
 * standalone processing notice beneath it. Sits in the detail page's side column.
 */
export function PostReferences({ post }: { post: SocialPostDetail }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          {t("socialPosts.detail.referencesTitle")}
        </h2>
        <dl className="flex flex-col gap-3">
          <ReferenceRow label={t("socialPosts.columns.pfmId")}>
            <CopyableId
              value={post.id}
              copyLabel={t("socialPosts.actions.copyPfmId")}
              className="break-all"
            />
          </ReferenceRow>
          <ReferenceRow label={t("socialPosts.columns.externalId")}>
            <CopyableId
              value={post.externalId}
              copyLabel={t("socialPosts.actions.copyExternalId")}
              className="break-all"
            />
          </ReferenceRow>
          <ReferenceRow label={t("socialPosts.detail.createdAt")}>
            <LocaleDateTime value={post.createdAt} />
          </ReferenceRow>
        </dl>
      </div>

      {post.status === "processed" ? (
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
