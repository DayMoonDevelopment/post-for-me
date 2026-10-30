import { useTranslation } from "react-i18next";

import type { SocialPostDetail } from "~/lib/types/social-post";

import { LocaleDateTime } from "~/ui/date-time";
import { Fact } from "~/ui/fact";

import { CaptionDisclosure } from "./post-content-caption";
import { MediaUrlRow } from "./post-content-media";

/**
 * The post's global configuration — the base every account inherits unless it
 * overrides: caption (collapsible), media (as URLs), and the scheduled post-at.
 */
export function PostContent({ post }: { post: SocialPostDetail }) {
  const { t } = useTranslation();
  const caption = post.caption.trim();

  return (
    <section className="flex flex-col gap-5">
      <Fact label={t("socialPosts.detail.captionTitle")}>
        <CaptionDisclosure caption={caption} />
      </Fact>

      <Fact label={t("socialPosts.detail.mediaTitle")}>
        {post.media.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {post.media.map((media) => (
              <MediaUrlRow key={media.url} media={media} />
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Fact>

      <Fact label={t("socialPosts.columns.postAt")}>
        <LocaleDateTime value={post.postAt} />
      </Fact>
    </section>
  );
}
