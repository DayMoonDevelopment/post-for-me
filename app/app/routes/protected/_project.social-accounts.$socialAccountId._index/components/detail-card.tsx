import type * as React from "react";

/**
 * One detail card: a bordered panel with a header (title + optional description
 * on the left, an optional action on the right) above the content. Mirrors the
 * Project Settings page's `SettingsCard` so the two read-only surfaces share the
 * same visual structure.
 */
export function DetailCard({
  title,
  description,
  action,
  children,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-heading text-sm font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-xs/relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * A read-only label/value line within a card — the same labelled-row treatment
 * as the settings page's `SettingsField` (label column → value). The value can
 * be plain text, a badge, or a copyable id.
 */
export function DetailField({
  label,
  children,
}: {
  children: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}
