import type { SocialPostComposerDraft } from "~/hooks/use-social-post-composer";
import type { SocialAccount } from "~/lib/post-for-me.types";

import { SocialPostComposerProvider } from "~/hooks/use-social-post-composer";

import { SocialPostPreviewPanel } from "../../protected/_project.projects.$projectId.playground._index/components/social-post-preview-panel";

// THROWAWAY dev-only harness to eyeball the installed social-post-preview end-to-end
// (resolver → chrome → device → switcher) without auth/API. Delete after verifying.
const ACCOUNTS: SocialAccount[] = [
  {
    id: "ig_1",
    platform: "instagram",
    username: "aperture.co",
    displayName: "Aperture",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
  },
  {
    id: "tt_1",
    platform: "tiktok",
    username: "aperture",
    displayName: "Aperture",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: "x_1",
    platform: "x",
    username: "aperture",
    displayName: "Aperture",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
  },
];

const DRAFT: SocialPostComposerDraft = {
  socialAccounts: ["ig_1", "tt_1", "x_1"],
  caption:
    "Golden hour on the ridgeline — three years of chasing this exact light. 🌄 Full set in bio.",
  media: [
    {
      id: "m1",
      url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1080&q=80",
      name: "ridge.jpg",
    },
  ],
  configuration: {},
  scheduledAt: null,
  isDraft: false,
};

export function loader() {
  return null;
}

export default function Component() {
  return (
    <div className="mx-auto max-w-sm p-6">
      <SocialPostComposerProvider accounts={ACCOUNTS} defaultValue={DRAFT}>
        <SocialPostPreviewPanel />
      </SocialPostComposerProvider>
    </div>
  );
}
