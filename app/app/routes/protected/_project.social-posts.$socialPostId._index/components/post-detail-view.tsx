import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type { SocialPostDetail } from "~/lib/types/social-post";

import { POST_STATUS_BADGE } from "~/components/post-status";
import { ArrowLeftIcon } from "~/icons";
import { Badge } from "~/ui/badge";
import { Separator } from "~/ui/separator";

import { AccountsTable } from "./accounts-table";
import { PostContent } from "./post-content";
import { PostReferences } from "./post-references";

/**
 * Post detail page body — the post as **intent + structure** (per-result outcome
 * detail lives on the standalone result page). A 2│1 split up top — title/status
 * + the global config ({@link PostContent}) beside a compact {@link PostReferences}
 * aside — then the {@link AccountsTable} fans out full width below.
 */
export function PostDetailView({ post }: { post: SocialPostDetail }) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <Link
        to={`/projects/${post.projectId}/social-posts`}
        className="inline-flex items-center gap-1.5 text-xs/relaxed text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        {t("socialPosts.detail.back")}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <header className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              {t("socialPosts.detail.title")}
            </h1>
            <Badge variant={POST_STATUS_BADGE[post.status]} size="sm">
              {t(`socialPosts.status.${post.status}`)}
            </Badge>
          </header>

          <PostContent post={post} />
        </div>

        <aside className="lg:col-span-1">
          <PostReferences post={post} />
        </aside>
      </div>

      <Separator />

      <AccountsTable accounts={post.accounts} />
    </div>
  );
}
