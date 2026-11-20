import { useOutletContext, useParams } from "react-router";

import { demos } from "../components/demos";
import { DEFAULT_LAYOUT, LAYOUTS } from "../layouts";
import type { ShowcaseContext } from "../layouts/parts";

/**
 * Resolves the docs entry for the slug and hands it to its layout. Page ORDER and
 * section composition live in `../layouts/*`; this only picks which one runs, so
 * a new page shape is a new layout file plus a map entry — not a change here.
 */
export function Component() {
  const { component } = useParams();
  const { base, style } = useOutletContext<ShowcaseContext>();
  const demo = component ? demos[component] : undefined;

  if (!demo || !component) {
    return (
      <p className="text-sm text-muted-foreground">
        No component named “{component}”.
      </p>
    );
  }

  const Layout = LAYOUTS[demo.layout ?? DEFAULT_LAYOUT];

  return (
    <Layout demo={demo} component={component} base={base} style={style} />
  );
}
