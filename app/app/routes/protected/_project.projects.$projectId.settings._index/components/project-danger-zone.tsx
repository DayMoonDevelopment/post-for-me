import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import type { Project } from "~/lib/types/project";

import { ConfirmDialog } from "~/components/confirm-dialog";
import {
  DangerZone,
  DangerZoneActions,
  DangerZoneDescription,
  DangerZoneHeader,
  DangerZoneTitle,
} from "~/components/danger-zone";
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
    <DangerZone>
      <DangerZoneHeader>
        <DangerZoneTitle>
          {t("projectSettings.dangerZone.title")}
        </DangerZoneTitle>
        <DangerZoneDescription>
          {t("projectSettings.dangerZone.deleteDescription")}
        </DangerZoneDescription>
      </DangerZoneHeader>

      <DangerZoneActions>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive">
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
            // Step 1's advance button: type the name first, then this advances
            // to the "are you sure?" final beat.
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
      </DangerZoneActions>
    </DangerZone>
  );
}
