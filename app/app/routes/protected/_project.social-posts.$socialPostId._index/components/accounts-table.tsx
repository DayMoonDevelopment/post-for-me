import { useTranslation } from "react-i18next";

import type { PostAccountResult } from "~/lib/types/social-post";

import { PostsIcon } from "~/icons";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/ui/empty";

import { AccountRow } from "./accounts-table-row";

/**
 * The accounts fan-out: one row per targeted account ({@link AccountRow}),
 * retaining the legacy identifier columns, with an empty state when the post
 * targets none.
 */
export function AccountsTable({
  accounts,
}: {
  accounts: PostAccountResult[];
}) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-sm font-semibold text-foreground">
        {t("socialPosts.detail.accountsTitle", { count: accounts.length })}
      </h2>
      {accounts.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PostsIcon />
            </EmptyMedia>
            <EmptyTitle>{t("socialPosts.detail.resultsEmptyTitle")}</EmptyTitle>
            <EmptyDescription>
              {t("socialPosts.detail.resultsEmpty")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium [&>th]:whitespace-nowrap">
                  <th>{t("socialPosts.detail.table.account")}</th>
                  <th>{t("socialPosts.detail.table.status")}</th>
                  <th>{t("socialPosts.detail.table.resultId")}</th>
                  <th>{t("socialPosts.detail.table.accountId")}</th>
                  <th>{t("socialPosts.detail.table.platformPostId")}</th>
                  <th>{t("socialPosts.detail.table.url")}</th>
                </tr>
              </thead>
              {accounts.map((result) => (
                <AccountRow key={result.account.id} result={result} />
              ))}
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
