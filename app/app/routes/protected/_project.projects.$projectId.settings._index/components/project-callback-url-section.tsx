import * as React from "react";
import { useTranslation } from "react-i18next";

import type { Project } from "~/lib/types/project";

import { Field, FieldDescription, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";

import { useSectionSave } from "../hooks/use-section-save";
import { ProjectConfigSection, SaveButton, SectionFooter } from "./section-frame";

/**
 * The project's optional OAuth callback URL (`projects.auth_callback_url`).
 * Submitting empty clears it. Applies to every project type.
 */
export function ProjectCallbackUrlSection({
  project,
  onSaved,
}: {
  onSaved?: () => void;
  project: Project;
}) {
  const { t } = useTranslation();
  const { fetcher, pending, action } = useSectionSave(project.id, onSaved);
  const original = project.callbackUrl ?? "";
  const [url, setUrl] = React.useState(original);
  // Ready to save once the URL changed (empty is valid — it clears the column).
  const canSave = url.trim() !== original.trim();

  return (
    <ProjectConfigSection
      title={t("projectSettings.callbackUrl.title")}
      description={t("projectSettings.callbackUrl.description")}
    >
      <fetcher.Form
        method="post"
        action={action}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="callback_url" />
        <Field>
          <FieldLabel htmlFor="project-callback-url">
            {t("projectSettings.callbackUrl.label")}
          </FieldLabel>
          <Input
            id="project-callback-url"
            name="callbackUrl"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={t("projectSettings.callbackUrl.placeholder")}
          />
          <FieldDescription>
            {t("projectSettings.callbackUrl.hint")}
          </FieldDescription>
        </Field>
        <SectionFooter>
          <SaveButton pending={pending} disabled={!canSave} />
        </SectionFooter>
      </fetcher.Form>
    </ProjectConfigSection>
  );
}
