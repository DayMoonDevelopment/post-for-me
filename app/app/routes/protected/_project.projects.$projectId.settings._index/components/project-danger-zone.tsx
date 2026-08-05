import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import type { Project } from "~/lib/types/project";

import { ConfirmDialog } from "~/components/confirm-dialog";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import { DeleteIcon } from "~/icons";
import { Button } from "~/ui/button";

/**
 * The settings page's danger zone: a destructive-framed card whose only action
 * is deleting the project. Deletion is irreversible, so it's gated behind a
 * type-the-name {@link ConfirmDialog}. A successful delete redirects to the
 * dashboard home (the action returns a `redirect`), so the dialog never needs to
 * close itself — the page navigates away; a failure toasts and leaves it open.
 */
export function ProjectDangerZone({ project }: { project: Project }) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  useActionErrorToast(fetcher);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-destructive/10 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="font-heading text-sm font-semibold text-destructive">
          {t("projectSettings.dangerZone.title")}
        </h2>
        <p className="text-xs/relaxed text-muted-foreground">
          {t("projectSettings.dangerZone.deleteDescription")}
        </p>
      </div>

      <ConfirmDialog
        trigger={
          <Button type="button" variant="destructive" className="shrink-0">
            <DeleteIcon />
            {t("projectSettings.dangerZone.deleteButton")}
          </Button>
        }
        title={t("projectSettings.dangerZone.confirmTitle", {
          name: project.name,
        })}
        description={t("projectSettings.dangerZone.confirmBody")}
        confirmStep={{
          title: t("projectSettings.dangerZone.confirmStepTitle"),
          description: t("projectSettings.dangerZone.confirmStepBody", {
            name: project.name,
          }),
          // Step 1's advance button: type the name first, then this advances to
          // the "are you sure?" final beat.
          continueLabel: t("projectSettings.dangerZone.deleteButton"),
        }}
        confirmLabel={t("projectSettings.dangerZone.permanentlyDelete")}
        destructive
        requireText={project.name}
        requireTextLabel={t("projectSettings.dangerZone.confirmLabel", {
          name: project.name,
        })}
        pending={fetcher.state !== "idle"}
        onConfirm={() =>
          fetcher.submit(
            { intent: "delete" },
            { method: "post", action: `/projects/${project.id}/settings` },
          )
        }
      />
    </section>
  );
}
