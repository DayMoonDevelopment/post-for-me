import type { Demo, DemoVariation } from "../components/demos";

import { CodeBlock } from "../components/code-block";
import { PreviewCode } from "../components/preview-code";
import {
  Anchor,
  DocsHeader,
  InstallCommand,
  RegistryConfig,
  slug,
  type ShowcaseContext,
} from "./parts";

/**
 * A block FAMILY: one page grouped into application CATEGORIES, each holding one
 * or more installable layout VARIATIONS.
 *
 *   Page title + description
 *   Global installation            (the registry wiring — stated once)
 *   Category (section) — title + description
 *     Variation — title, preview, installation, usage
 *
 * The registry config is identical for every item, so it lives once up top; then
 * each variation is self-contained (preview → install → usage) so a reader who's
 * picked one never has to look elsewhere.
 */
export function BlockFamilyLayout({
  demo,
  component,
  base,
  style,
}: ShowcaseContext & { component: string; demo: Demo }) {
  const categories = demo.categories ?? [];

  return (
    <article className="mx-auto max-w-2xl space-y-14 pb-16">
      <DocsHeader title={demo.title} description={demo.description} />

      {/* Stated once — every variation installs the same way. */}
      <section className="space-y-4">
        <div className="space-y-1">
          <Anchor id="installation" level="h2">
            Installation
          </Anchor>
          <p className="text-sm text-muted-foreground">
            Add the @post-for-me registry to your components.json once (the style
            field carries your base + style). Each variation below then installs on
            its own with the command in its section.
          </p>
        </div>
        <RegistryConfig base={base} style={style} />
        {demo.installNote}
      </section>

      {categories.map((category) => {
        const catId = slug(category.name);
        return (
          <section key={category.name} className="space-y-6">
            <div className="space-y-1">
              <Anchor id={catId} level="h2">
                {category.name}
              </Anchor>
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            </div>

            {category.variations.map((variation, index) => (
              <Variation
                key={variation.install}
                variation={variation}
                // A single unnamed variation anchors off the category; named ones
                // get their own id under it.
                idBase={variation.name ? `${catId}-${slug(variation.name)}` : catId}
                component={component}
                base={base}
                style={style}
                showDivider={index > 0}
              />
            ))}
          </section>
        );
      })}
    </article>
  );
}

/** One layout variation: title (when named) → preview → installation → usage. */
function Variation({
  variation,
  idBase,
  component,
  base,
  style,
  showDivider,
}: ShowcaseContext & {
  component: string;
  idBase: string;
  showDivider: boolean;
  variation: DemoVariation;
}) {
  return (
    <div className={showDivider ? "border-t border-border pt-6" : undefined}>
      <div className="space-y-4">
        {variation.name ? (
          <Anchor id={idBase} level="h3">
            {variation.name}
          </Anchor>
        ) : null}

        <div className="space-y-3">
          <SubLabel id={`${idBase}-preview`}>Preview</SubLabel>
          <PreviewCode preview={variation.preview} code={variation.code} />
        </div>

        <div className="space-y-3">
          <SubLabel id={`${idBase}-installation`}>Installation</SubLabel>
          <InstallCommand
            item={variation.install}
            component={component}
            base={base}
            style={style}
          />
        </div>

        <div className="space-y-3">
          <SubLabel id={`${idBase}-usage`}>Usage</SubLabel>
          <CodeBlock>{variation.usage}</CodeBlock>
        </div>
      </div>
    </div>
  );
}

/** A small labeled anchor for a variation's parts (Preview / Installation / Usage). */
function SubLabel({ id, children }: { children: string; id: string }) {
  return (
    <h4
      id={id}
      className="scroll-mt-20 text-xs font-medium tracking-wide text-muted-foreground uppercase"
    >
      {children}
    </h4>
  );
}
