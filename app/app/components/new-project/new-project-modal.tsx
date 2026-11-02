import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useLocation } from "react-router";

import type { SetupActionDialogProps } from "~/components/setup-action-dialog";
import type { ProjectType } from "~/lib/types/project";

import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
} from "~/components/modal";
import { PROJECT_TYPE_MODES } from "~/lib/project-type-modes";
import { Button } from "~/ui/button";
import {
  Choicebox,
  ChoiceboxItem,
  ChoiceboxItemContent,
  ChoiceboxItemDescription,
  ChoiceboxItemIcon,
  ChoiceboxItemIndicator,
  ChoiceboxItemTitle,
} from "~/ui/choicebox";
import { Field, FieldGroup, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";
import { Spinner } from "~/ui/spinner";

const DEFAULT_NAME = "Untitled Project";
const DEFAULT_TYPE: ProjectType = "quickstart";

/**
 * `NewProjectModal` — name + type prompt for creating a project. Posts to the
 * team-scoped `redirect.*` route (`redirect.teams.$teamId.projects`), which
 * always redirects (success → the new project, failure → back here with a
 * flashed toast) — so, like `ConnectAccountModal`, validation is client-side
 * only (`canCreate`) and there's no in-dialog error state to render.
 */
export function NewProjectModal({
  open: openProp,
  onOpenChange,
  defaultOpen = false,
  trigger,
  teamId,
}: SetupActionDialogProps & { teamId: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const fetcher = useFetcher();
  const creating = fetcher.state !== "idle";

  // Optionally-controlled, same shape as `open`/`onOpenChange` elsewhere, but
  // owned here (rather than just forwarded to `Modal`) so the effect below can
  // close the dialog itself — including the uncontrolled case (`nav-projects.tsx`'s
  // trigger), where no external `onOpenChange` exists to call.
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = isControlled ? openProp : uncontrolledOpen;

  const [name, setName] = React.useState(DEFAULT_NAME);
  const [type, setType] = React.useState<ProjectType>(DEFAULT_TYPE);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
      if (!next) {
        setName(DEFAULT_NAME);
        setType(DEFAULT_TYPE);
      }
    },
    [isControlled, onOpenChange],
  );

  // The route always redirects — success to the new project, failure back to
  // `return_to` — so once that redirect navigation is under way (`loading`),
  // the dialog's job is done. Closing it explicitly here matters because the
  // trigger/state live in the persistent shell (sidebar, tenant switcher),
  // which does NOT unmount on an in-app navigation the way leaving the SPA
  // entirely would (contrast the connect-account modal, which redirects
  // off-origin and so gets this "for free").
  React.useEffect(() => {
    if (fetcher.state === "loading") handleOpenChange(false);
  }, [fetcher.state, handleOpenChange]);

  const canCreate = name.trim().length > 0;

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      {trigger}
      <ModalContent layout="simple" data-slot="new-project-modal">
        <div className="flex flex-col gap-1.5">
          <ModalTitle>{t("sidebar.newProjectDialog.title")}</ModalTitle>
          <p className="text-sm/normal text-muted-foreground">
            {t("sidebar.newProjectDialog.description")}
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-project-name">
              {t("sidebar.newProjectDialog.nameLabel")}
            </FieldLabel>
            <Input
              id="new-project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("sidebar.newProjectDialog.namePlaceholder")}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <Field>
            <FieldLabel id="new-project-type-label">
              {t("sidebar.newProjectDialog.typeLabel")}
            </FieldLabel>
            <Choicebox
              aria-labelledby="new-project-type-label"
              orientation="vertical"
              className="grid grid-cols-2 gap-3"
              value={[type]}
              onValueChange={(value) => {
                // Single-select can toggle back to empty; ignore that so a type
                // is always selected.
                const next = value[0];
                if (next) setType(next as ProjectType);
              }}
            >
              {PROJECT_TYPE_MODES.map((mode) => (
                <ChoiceboxItem key={mode.id} value={mode.id} data-brand={mode.id}>
                  <ChoiceboxItemIcon>
                    <mode.icon />
                  </ChoiceboxItemIcon>
                  <ChoiceboxItemContent>
                    <ChoiceboxItemTitle>{t(mode.titleKey)}</ChoiceboxItemTitle>
                    <ChoiceboxItemDescription>
                      {t(mode.descriptionKey)}
                    </ChoiceboxItemDescription>
                  </ChoiceboxItemContent>
                  <ChoiceboxItemIndicator />
                </ChoiceboxItem>
              ))}
            </Choicebox>
          </Field>
        </FieldGroup>

        <ModalFooter>
          <ModalClose render={<Button variant="ghost" />}>
            {t("common.cancel")}
          </ModalClose>
          <fetcher.Form
            method="post"
            action={`/redirect/teams/${teamId}/projects`}
            className="contents"
          >
            <input type="hidden" name="name" value={name.trim()} />
            <input type="hidden" name="type" value={type} />
            <input
              type="hidden"
              name="return_to"
              value={location.pathname + location.search}
            />
            <Button type="submit" disabled={!canCreate || creating}>
              {creating ? <Spinner /> : null}
              {t("sidebar.newProjectDialog.create")}
            </Button>
          </fetcher.Form>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
