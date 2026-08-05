import type { SocialProvider } from "~/lib/post-for-me.types";
import { BrandMark } from "~/ui/brand-mark";

const PROVIDERS: SocialProvider[] = [
  "bluesky",
  "facebook",
  "instagram",
  "linkedin",
  "pinterest",
  "threads",
  "tiktok",
  "tiktok_business",
  "x",
  "youtube",
];

/** Visual reference for the `SocialProvider` union — each value + its brand mark. */
export function SocialProviderReference() {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
      {PROVIDERS.map((provider) => (
        <div
          key={provider}
          className="flex items-center gap-2 rounded-lg border bg-card p-2.5"
        >
          <BrandMark platform={provider} className="size-5 shrink-0" />
          <code className="min-w-0 truncate font-mono text-[11px]">
            {provider}
          </code>
        </div>
      ))}
    </div>
  );
}
