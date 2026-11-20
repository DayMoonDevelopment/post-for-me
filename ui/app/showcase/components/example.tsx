import * as React from "react";

// A named example: the supporting copy (h3 + description) sits outside, and the
// live component is centered in its own framed container — the same framed
// treatment as the hero preview.
export function Example({
  name,
  description,
  children,
}: {
  name: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="font-medium tracking-tight">{name}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="rounded-xl flex min-h-52 items-center justify-center border bg-background p-8">
        {children}
      </div>
    </section>
  );
}
