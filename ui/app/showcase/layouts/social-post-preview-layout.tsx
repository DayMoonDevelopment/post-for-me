import type { Demo } from "../components/demos";

import { CodeBlock } from "../components/code-block";
import { PropsTable } from "../components/props-table";
import {
  SocialPostPreviewBreadthWall,
  SocialPostPreviewCascadeFigure,
  SocialPostPreviewEnrichmentFigure,
  SocialPostPreviewPlatformLinks,
} from "../components/social-post-preview-sections";
import {
  DocsHeader,
  InstallCommand,
  PreviewMeta,
  RegistryConfig,
  Section,
  type ShowcaseContext,
} from "./parts";

/**
 * The flagship page for Social Post Preview — a bespoke story arc, not the standard
 * component template. The reader is walked through a sequence of questions:
 *
 *   1. Hero — "what is this?"          → the per-platform showcase, every variant auto-rendered
 *   2. Install + Usage — "how do I?"   → act at peak intent
 *   3. Cascade — "does it respect my config?"
 *   4. Compose your own — "can I customize?" → every chrome is a primitive, linked per platform
 *   5. API reference
 *
 * Per-platform deep dives (renderings, primitives, composition) also live on their own nested
 * pages; this page stays anchored on the auto-renderer.
 */
export function SocialPostPreviewLayout({
  demo,
  component,
  base,
  style,
}: ShowcaseContext & { component: string; demo: Demo }) {
  return (
    <article className="mx-auto max-w-2xl space-y-14 pb-16">
      {/* 1 — Header + the per-platform showcase (auto-renderer across every variant) as the hero */}
      <DocsHeader title={demo.title} description={demo.description} />

      <div className="space-y-2">
        <SocialPostPreviewBreadthWall />
        <PreviewMeta sourceFile={demo.sourceFile} base={base} style={style} />
      </div>

      {/* 2 — Install + Usage (front-loaded: capture intent right after the hook) */}
      <Section
        title="Installation"
        description="Add the @post-for-me registry to your components.json once (the style field carries your base + style), then add the component with the CLI."
      >
        <RegistryConfig base={base} style={style} />
        <InstallCommand
          item={demo.install ?? component}
          component={component}
          base={base}
          style={style}
        />
      </Section>

      <Section title="Usage">
        <CodeBlock>{demo.usage}</CodeBlock>
        {demo.usageExtra}
      </Section>

      {/* 3 — Cascade */}
      <Section
        title="Configuration cascade"
        description="One post in, the real per-destination truth out. Caption and media resolve post ▸ platform ▸ account, so each frame shows exactly what that account will publish."
      >
        <SocialPostPreviewCascadeFigure />
      </Section>

      {/* 4 — Enrichment — bare IDs render placeholders; enrich by hand for the real thing */}
      <Section
        title="Enrichment"
        description="Post for Me stores some fields as bare IDs — a post's social_accounts are account ids, an X repost's quote_tweet_id is one string. Pass them raw and the preview shows a skeleton where the data would go (never invented names or avatars); enrich by hand with the full object (username, avatar, the quoted caption + media) and it fills in for real. You decide the fidelity."
      >
        <SocialPostPreviewEnrichmentFigure />
      </Section>

      {/* 5 — Compose your own — every chrome is a directly-referenceable primitive */}
      <Section
        title="Compose your own"
        description="The auto-renderer is one path. Every chrome is also exported as a primitive you can reference directly — render just a tweet, stack a TikTok's media + UI layers, wrap them in your own card or device — for fully custom experiences. Each platform documents its exact primitives and how to compose them:"
      >
        <SocialPostPreviewPlatformLinks />
      </Section>

      {/* 6 — API reference */}
      {demo.api.length ? (
        <Section title="API Reference">
          <PropsTable groups={demo.api} />
        </Section>
      ) : null}
    </article>
  );
}
