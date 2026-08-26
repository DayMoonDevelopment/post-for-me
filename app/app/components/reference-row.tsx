/**
 * A horizontal label→value row — a fixed-width muted label with the value filling
 * the rest. The building block of the detail surfaces' references cards.
 */
export function ReferenceRow({
  label,
  children,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-baseline gap-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}
