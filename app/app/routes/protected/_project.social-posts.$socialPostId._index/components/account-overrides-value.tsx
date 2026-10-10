import type { PostAccountOverride } from "~/lib/types/social-post";

/**
 * Render one resolved override value — media as a URL list, everything else as
 * (pre-wrapped) text.
 */
export function OverrideValue({ override }: { override: PostAccountOverride }) {
  if (override.field === "media") {
    return (
      <div className="flex flex-col gap-0.5">
        {override.value.split("\n").map((url) => (
          <span key={url} className="truncate font-mono text-xs">
            {url}
          </span>
        ))}
      </div>
    );
  }
  return <span className="whitespace-pre-wrap">{override.value}</span>;
}
