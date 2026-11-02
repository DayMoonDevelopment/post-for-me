import { useTranslation } from "react-i18next";

import type { PostMedia } from "~/lib/types/social-post";

import { Copyable } from "~/ui/copyable";

/**
 * One base media item, shown as its URL (transient — may have expired), copyable
 * only (no link), never as a rendered asset.
 */
export function MediaUrlRow({ media }: { media: PostMedia }) {
  const { t } = useTranslation();
  return (
    <Copyable
      value={media.url}
      label={t("socialPosts.detail.copyMediaUrl")}
      className="max-w-full self-start"
    >
      <span className="truncate font-mono text-xs">{media.url}</span>
    </Copyable>
  );
}
