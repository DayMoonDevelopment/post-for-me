import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type {
  AccountPost,
  SocialPostStatus,
} from "~/lib/types/social-account";

import { ChevronRightIcon, PostsIcon } from "~/icons";
import { Badge } from "~/ui/badge";
import { Card } from "~/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/ui/empty";

import { formatDate } from "../utils";

type PostBadgeVariant =
  | "secondary"
  | "info-light"
  | "warning-light"
  | "success-light";

const POST_STATUS_BADGE: Record<SocialPostStatus, PostBadgeVariant> = {
  draft: "secondary",
  scheduled: "info-light",
  processing: "warning-light",
  processed: "success-light",
};

/**
 * The posts this account has been included in — newest first, each row linking
 * to `/social-posts/$id` (the post detail route is not built yet; the link is
 * intentional). Read-only; data comes from the loader.
 */
export function AccountPostsTable({ posts }: { posts: AccountPost[] }) {
  const { i18n, t } = useTranslation();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-sm font-semibold text-foreground">
        {t("socialAccounts.detail.postsTitle")}
      </h2>

      {posts.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PostsIcon />
            </EmptyMedia>
            <EmptyTitle>
              {t("socialAccounts.detail.postsEmptyTitle")}
            </EmptyTitle>
            <EmptyDescription>
              {t("socialAccounts.detail.postsEmpty")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // A flush list, not a titled card: zero the Card's padding/gap so the
        // divided rows sit edge-to-edge inside its ring + radius.
        <Card className="gap-0 py-0">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/social-posts/${post.id}`}
              className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {post.caption.trim() || (
                  <span className="text-muted-foreground">
                    {t("socialAccounts.detail.postNoCaption")}
                  </span>
                )}
              </span>
              <Badge variant={POST_STATUS_BADGE[post.status]} size="sm">
                {t(`socialAccounts.detail.postStatus.${post.status}`)}
              </Badge>
              <span className="shrink-0 text-xs text-foreground">
                {formatDate(post.postAt, i18n.language)}
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
