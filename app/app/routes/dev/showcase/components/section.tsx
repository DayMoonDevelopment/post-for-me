export function Section({
  title,
  children,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}
