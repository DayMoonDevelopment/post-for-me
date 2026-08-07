import { useTranslation } from "react-i18next";

import type { ApiKey } from "~/lib/types/api-key";

import { DeleteIcon, EditIcon, MoreIcon } from "~/icons";
import { Button } from "~/ui/button";
import { LocaleDateTime } from "~/ui/date-time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";

/**
 * Dumb, composable table of a project's API keys — Name · Key reference (masked
 * preview) · Created · Created by, plus a per-row actions menu (rename / delete)
 * wired to the host's passthrough handlers. Renders our domain {@link ApiKey}
 * (never the provider's shape) and does no fetching.
 */
export function ApiKeysTable({
  apiKeys,
  onRename,
  onDelete,
}: {
  apiKeys: ApiKey[];
  onDelete: (apiKey: ApiKey) => void;
  onRename: (apiKey: ApiKey) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium [&>th]:whitespace-nowrap">
              <th>{t("apiKeys.columns.name")}</th>
              <th>{t("apiKeys.columns.reference")}</th>
              <th>{t("apiKeys.columns.created")}</th>
              <th>{t("apiKeys.columns.createdBy")}</th>
              <th className="w-14 text-right">
                <span className="sr-only">{t("common.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((apiKey) => (
              <tr
                key={apiKey.id}
                className="border-b border-border last:border-0 [&>td]:px-4 [&>td]:py-3 [&>td]:align-middle"
              >
                <td className="font-medium">
                  {apiKey.name ?? (
                    <span className="text-muted-foreground">
                      {t("apiKeys.unnamed")}
                    </span>
                  )}
                </td>
                <td>
                  <span className="font-mono text-xs text-muted-foreground">
                    {apiKey.reference}…
                  </span>
                </td>
                <td className="whitespace-nowrap text-muted-foreground">
                  <LocaleDateTime value={apiKey.createdAt} />
                </td>
                <td className="whitespace-nowrap text-muted-foreground">
                  {apiKey.createdBy?.label ?? "—"}
                </td>
                <td className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("apiKeys.actions.menu")}
                        >
                          <MoreIcon />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onRename(apiKey)}>
                        <EditIcon />
                        {t("apiKeys.actions.rename")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(apiKey)}
                      >
                        <DeleteIcon />
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
