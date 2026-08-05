import * as React from "react";
import { useTranslation } from "react-i18next";

import type { Project } from "~/lib/types/project";

import { Field, FieldDescription, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";
import { ProjectTypeBadge } from "~/ui/project-type-badge";

import { useSectionSave } from "../hooks/use-section-save";
import { ProjectConfigSection, SaveButton, SectionFooter } from "./section-frame";

/**
 * Project details — name (editable) + type (read-only). Settings page only:
 * type is fixed once a project exists (it determines the credential model), so
 * it shows as a badge rather than a control.
 */
export function ProjectDetailsSection({
  project,
  onSaved,
}: {
  onSaved?: () => void;
  project: Project;
}) {
  const { t } = useTranslation();
  const { fetcher, pending, action } = useSectionSave(project.id, onSaved);
  const [name, setName] = React.useState(project.name);
  // Ready to save once the name actually changed (and isn't empty — it's required).
  const canSave = name.trim() !== "" && name.trim() !== project.name.trim();

  return (
    <ProjectConfigSection
      title={t("projectSettings.details.title")}
      description={t("projectSettings.details.description")}
    >
      <fetcher.Form
        method="post"
        action={action}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="name" />
        <Field>
          <FieldLabel htmlFor="project-name">
            {t("projectSettings.details.nameLabel")}
          </FieldLabel>
          <Input
            id="project-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel>{t("projectSettings.details.typeLabel")}</FieldLabel>
          <div>
            <ProjectTypeBadge type={project.type} />
          </div>
          <FieldDescription>
            {t("projectSettings.details.typeReadonly")}
          </FieldDescription>
        </Field>
        <SectionFooter>
          <SaveButton pending={pending} disabled={!canSave} />
        </SectionFooter>
      </fetcher.Form>
    </ProjectConfigSection>
  );
}
