import { useTranslation } from "react-i18next";

import type { ResolvedConfigField } from "~/lib/types/social-post-result";

import { Copyable } from "~/ui/copyable";

/**
 * One resolved field's value — media as a copyable URL list, everything else as
 * (pre-wrapped) text.
 */
export function ResolvedValue({ field }: { field: ResolvedConfigField }) {
  const { t } = useTranslation();
  if (field.field === "media") {
    return (
      <div className="flex flex-col gap-1">
        {field.value.split("\n").map((url) => (
          <Copyable
            key={url}
            value={url}
            label={t("socialPosts.detail.copyMediaUrl")}
            className="max-w-full self-start"
          >
            <span className="truncate font-mono text-xs">{url}</span>
          </Copyable>
        ))}
      </div>
    );
  }
  return <span className="whitespace-pre-wrap">{field.value}</span>;
}
