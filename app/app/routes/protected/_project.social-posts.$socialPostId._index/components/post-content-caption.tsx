import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "~/lib/utils";

/**
 * Caption shown clamped, with a Show more / Show less toggle that only appears
 * when the text actually overflows the collapsed clamp.
 */
export function CaptionDisclosure({ caption }: { caption: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  // Measure once collapsed: does the text exceed the line-clamp? (Deliberately
  // not keyed on `expanded` — measuring while expanded would read no overflow.)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setCanExpand(el.scrollHeight > el.clientHeight + 1);
  }, [caption]);

  if (!caption) {
    return (
      <span className="text-muted-foreground">
        {t("socialPosts.noCaption")}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <p
        ref={ref}
        className={cn(
          "whitespace-pre-wrap text-foreground",
          !expanded && "line-clamp-3",
        )}
      >
        {caption}
      </p>
      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded
            ? t("socialPosts.detail.showLess")
            : t("socialPosts.detail.showMore")}
        </button>
      ) : null}
    </div>
  );
}
