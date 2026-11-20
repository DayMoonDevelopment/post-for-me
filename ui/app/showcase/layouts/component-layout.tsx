import type { Demo } from "../components/demos";

import { CodeBlock } from "../components/code-block";
import { PreviewCode } from "../components/preview-code";
import { PropsTable } from "../components/props-table";
import {
  Anchor,
  DocsHeader,
  InstallCommand,
  PreviewMeta,
  RegistryConfig,
  Section,
  slug,
  type ShowcaseContext,
} from "./parts";

/**
 * The default docs page: one lead preview, then Installation → Usage →
 * Composition → Examples → API Reference. Every component and single-item block
 * uses this; it's what `layout` falls back to.
 */
export function ComponentLayout({
  demo,
  component,
  base,
  style,
}: ShowcaseContext & { component: string; demo: Demo }) {
  return (
    <article className="mx-auto max-w-2xl space-y-14 pb-16">
      <DocsHeader title={demo.title} description={demo.description} />

      <div className="space-y-3">
        <PreviewCode preview={demo.preview} code={demo.code} />
        <PreviewMeta sourceFile={demo.sourceFile} base={base} style={style} />
      </div>

      <Section
        title="Installation"
        description="Add the @post-for-me registry to your components.json once (the style field carries your base + style), then add any component with the CLI."
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

      {demo.composition ? (
        <Section
          title="Composition"
          description="The component's parts and their props."
        >
          <CodeBlock lang="text">{demo.composition}</CodeBlock>
        </Section>
      ) : null}

      {/* Examples — previewable + copyable code; the composed ones install on
          their own (pulling in the components they use). */}
      {demo.examples.length ? (
        <Section title="Examples">
          <div className="space-y-8">
            {demo.examples.map((example) => {
              const id = slug(`example ${example.name}`);
              return (
                <div key={example.name} className="space-y-3">
                  <div className="space-y-1">
                    <Anchor id={id} level="h3">
                      {example.name}
                    </Anchor>
                    {example.description ? (
                      <p className="text-sm text-muted-foreground">
                        {example.description}
                      </p>
                    ) : null}
                    {example.docs ? (
                      <a
                        href={example.docs.href}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-fit text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      >
                        {example.docs.label} →
                      </a>
                    ) : null}
                  </div>
                  <PreviewCode
                    preview={example.preview}
                    code={example.code}
                    minHeight="min-h-52"
                  />
                  {example.install ? (
                    <InstallCommand
                      item={example.install}
                      component={component}
                      base={base}
                      style={style}
                      event="example_install_copied"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {demo.api.length ? (
        <Section title="API Reference">
          <PropsTable groups={demo.api} />
        </Section>
      ) : null}
    </article>
  );
}
