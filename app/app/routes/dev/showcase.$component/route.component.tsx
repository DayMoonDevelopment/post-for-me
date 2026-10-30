import { useParams } from "react-router";

import { demos } from "../showcase/components/demos";

export function Component() {
  const { component } = useParams();
  const demo = component ? demos[component] : undefined;

  if (!demo) {
    return (
      <p className="text-sm text-muted-foreground">
        No demo named “{component}”.
      </p>
    );
  }

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-medium">{demo.title}</h2>
        <p className="text-sm text-muted-foreground">{demo.description}</p>
      </header>
      {demo.element}
    </article>
  );
}
