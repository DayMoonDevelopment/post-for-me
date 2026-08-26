import type * as React from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/card";

/**
 * One detail card: a {@link Card} with a header (title + optional description on
 * the left, an optional action on the right) above the content. Mirrors the
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
