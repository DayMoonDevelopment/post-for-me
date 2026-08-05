import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import type { WebhookSummary } from "~/lib/types/webhook";

import { RowLink } from "~/components/grid-cells";
import { DeleteIcon, EditIcon, MoreIcon } from "~/icons";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";

/**
 * Dumb table of a project's webhooks — URL · subscribed event types · created,
 * plus a per-row actions menu (edit / delete) wired to the host's passthrough
 * handlers. A row click opens the webhook's detail page. Few webhooks per
 * project, so this is a plain table (no server pagination/filters).
 */
export function WebhooksTable({
  webhooks,
  projectId,
  onEdit,
  onDelete,
}: {
  onDelete: (webhook: WebhookSummary) => void;
  onEdit: (webhook: WebhookSummary) => void;
  projectId: string;
  webhooks: WebhookSummary[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium [&>th]:whitespace-nowrap">
              <th>{t("webhooks.columns.url")}</th>
              <th>{t("webhooks.columns.eventTypes")}</th>
              <th className="w-14 text-right">
                <span className="sr-only">{t("common.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map((webhook) => (
              <tr
                key={webhook.id}
                onClick={() =>
                  navigate(`/projects/${projectId}/webhooks/${webhook.id}`)
                }
                className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/30 [&>td]:px-4 [&>td]:py-3 [&>td]:align-middle"
              >
                <td className="max-w-xs">
                  {/* The URL cell is this row's navigating link — a `<tr>`
                      onClick alone is mouse-only. */}
                  <RowLink
                    to={`/projects/${projectId}/webhooks/${webhook.id}`}
                  >
                    <span className="block truncate font-medium">
                      {webhook.url}
                    </span>
                  </RowLink>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {webhook.eventTypes.map((type) => (
                      <Badge
                        key={type}
                        variant="secondary"
                        size="xs"
                        className="font-mono"
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="text-right">
                  {/* Stop propagation so the menu doesn't trigger the row's
                      navigate-to-detail click. */}
                  <div onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("webhooks.actions.menu")}
                          >
                            <MoreIcon />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(webhook)}>
                          <EditIcon />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(webhook)}
                        >
                          <DeleteIcon />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
