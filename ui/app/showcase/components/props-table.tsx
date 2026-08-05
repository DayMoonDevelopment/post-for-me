export type PropRow = {
  prop: string;
  type: string;
  default?: string;
  description?: string;
};

export type PropGroup = {
  /** The part these props belong to (e.g. "UserAvatar"). */
  title: string;
  rows: PropRow[];
};

/** A shadcn-style API reference: one bordered table per component part. */
export function PropsTable({ groups }: { groups: PropGroup[] }) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h3 className="font-mono text-sm font-medium">{group.title}</h3>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Prop</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Default</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {group.rows.map((row) => (
                  <tr key={row.prop} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-foreground">
                        {row.prop}
                      </div>
                      {row.description ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {row.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.default ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
