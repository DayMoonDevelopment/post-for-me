import type { SocialProvider } from "~/lib/post-for-me.types";

import { CodeBlock } from "../components/code-block";
import type { Demo } from "../components/demos";
import {
  PLATFORM_DOCS,
  PlatformPrimitivesTable,
} from "../components/social-post-preview-platform-docs";
import { PlatformRenderings } from "../components/social-post-preview-sections";
import {
  DocsHeader,
  InstallCommand,
  RegistryConfig,
  Section,
  type ShowcaseContext,
} from "./parts";

/**
 * A per-platform page under Social Post Preview. The parent page owns the auto-renderer story;
 * each of these focuses on ONE platform's chromes — the renderings it produces, the exact
 * primitives you compose (bare chrome + any media/UI layers), and how to wire them yourself.
 * Config lives in {@link PLATFORM_DOCS}; renderings reuse the breadth wall's per-platform tiles.
 */
export function PlatformChromeLayout({
  demo,
  component,
  base,
  style,
}: ShowcaseContext & { component: string; demo: Demo }) {
  const platform = demo.platform as SocialProvider | undefined;
  const doc = platform ? PLATFORM_DOCS[platform] : undefined;

  return (
    <article className="mx-auto max-w-2xl space-y-14 pb-16">
      <DocsHeader title={demo.title} description={doc?.blurb ?? demo.description} />

      {platform ? (
        <Section
          title="Renderings"
          description="Every surface this platform produces, rendered in the device frame."
        >
          <PlatformRenderings platform={platform} />
        </Section>
      ) : null}

      {doc ? (
        <>
          <Section
            title="Primitives"
            description="The exported building blocks for this platform. The auto-renderer composes these; drop to them for full control."
          >
            {doc.hierarchy ? (
              <CodeBlock lang="text" className="mb-5">
                {doc.hierarchy}
              </CodeBlock>
            ) : null}
            <PlatformPrimitivesTable primitives={doc.primitives} />
          </Section>

          <Section
            title="Compose your own"
            description="Render the bare chrome in your own card, or stack the layers to swap the media or restyle the UI."
          >
            <CodeBlock>{doc.compose}</CodeBlock>
          </Section>
        </>
      ) : null}

      <Section
        title="Installation"
        description="Every platform chrome ships in the one Social Post Preview component — install it once."
      >
        <RegistryConfig base={base} style={style} />
        <InstallCommand
          item="social-post-preview"
          component={component}
          base={base}
          style={style}
        />
      </Section>
    </article>
  );
}
