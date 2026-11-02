import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  SocialPostPreview,
  type SocialPostPreviewAccount,
  type SocialPostPreviewInput,
  type SocialPostPreviewMediaInput,
} from "~/components/social-post-preview";
import { useSocialPostComposerContext } from "~/hooks/use-social-post-composer";

/**
 * The Playground's live preview — the registry's `@post-for-me/social-post-preview`
 * `SocialPostPreview` driven by the same {@link useSocialPostComposerContext}
 * draft the composer edits. As accounts, caption, media, and per-platform config change,
 * it re-resolves the configuration cascade and shows one platform-accurate frame per
 * targeted account (with the built-in switcher when there's more than one).
 *
 * Note the account adapter below: the registry's `SocialPostPreviewInput` is SDK-shaped
 * (snake_case `profile_photo_url` / `display_name`), while this dashboard normalizes
 * accounts to a camelCase `SocialAccount` (`avatarUrl` / `displayName`). A real, retrieved
 * `SocialPost` is "assignable as-is", but our already-normalized model needs this small map.
 */
export function SocialPostPreviewPanel() {
  const { t } = useTranslation();
  const { targetedAccounts, caption, media, configuration } =
    useSocialPostComposerContext();

  const post = useMemo<SocialPostPreviewInput>(() => {
    const social_accounts = targetedAccounts.map<SocialPostPreviewAccount>(
      (account) => ({
        id: account.id,
        platform: account.platform,
        username: account.username,
        profile_photo_url: account.avatarUrl,
        display_name: account.displayName,
      }),
    );

    // Preview off the local preview URL until the file is uploaded at publish time —
    // the composer already holds an object URL per picked file, so reuse it rather than
    // letting the preview mint a second one.
    const previewMedia: SocialPostPreviewMediaInput[] = [];
    for (const item of media) {
      const url = item.url ?? item.previewUrl;
      if (!url) continue;
      previewMedia.push({ url, thumbnail_url: item.thumbnailUrl ?? undefined });
    }

    // `SocialPostPreviewInput` accepts the create-body configuration shape, which is exactly
    // what the composer holds — so the config fields spread in with no cast or adapter.
    return {
      caption,
      social_accounts,
      media: previewMedia,
      platform_configurations: configuration.platform_configurations,
      account_configurations: configuration.account_configurations,
    };
  }, [targetedAccounts, caption, media, configuration]);

  const hasTargets = targetedAccounts.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{t("playground.previewLabel")}</span>
      <div className="rounded-lg border bg-muted/30 p-4">
        {hasTargets ? (
          <SocialPostPreview post={post} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("playground.previewEmpty")}
          </p>
        )}
      </div>
    </div>
  );
}
