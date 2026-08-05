import type * as React from "react";

import { useTranslation } from "react-i18next";

import type { ProviderCredentialStatus } from "~/lib/onboarding";
import type { Project } from "~/lib/types/project";

import { InfoIcon } from "~/icons";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { ProjectTypeBadge } from "~/ui/project-type-badge";

import { ProjectCallbackUrlSection } from "./project-callback-url-section";
import { ProjectDangerZone } from "./project-danger-zone";
import { ProjectDetailsSection } from "./project-details-section";
import { ProjectPlatformsSection } from "./project-platforms-section";
import { SectionEditDialog } from "./section-edit-dialog";

/**
 * The project settings page body: a full-bleed 3|2 grid of cards. The larger
 * left zone holds the project's primary config — details, the platforms list
 * (a static alphabetical roster managed inline), and the danger zone; the
 * smaller right zone holds the OAuth callback URL. Details and the callback URL
 * are read-only with a per-card {@link SectionEditDialog}; platforms are managed
 * inline (see {@link ProjectPlatformsSection}).
 */
export function ProjectSettingsView({
  project,
  credentials,
}: {
  credentials: ProviderCredentialStatus[];
  project: Project;
}) {
  const { t } = useTranslation();
  const isWhiteLabel = project.type === "white-label";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
      {/* Larger zone: the project's primary configuration. */}
      <div className="flex flex-col gap-6 lg:col-span-3">
        <SettingsCard
          title={t("projectSettings.details.title")}
          description={t("projectSettings.details.description")}
          action={
            <SectionEditDialog title={t("projectSettings.details.title")}>
              {(close) => (
                <ProjectDetailsSection project={project} onSaved={close} />
              )}
            </SectionEditDialog>
          }
        >
          <dl className="flex flex-col gap-3">
            <SettingsField label={t("projectSettings.details.nameLabel")}>
              {project.name}
            </SettingsField>
            <SettingsField label={t("projectSettings.details.typeLabel")}>
              <ProjectTypeBadge type={project.type} />
            </SettingsField>
          </dl>
        </SettingsCard>

        <SettingsCard
          title={t("projectSettings.platforms.title")}
          description={
            isWhiteLabel
              ? t("projectSettings.platforms.whiteLabelHint")
              : t("projectSettings.platforms.quickstartHint")
          }
        >
          <ProjectPlatformsSection
            projectId={project.id}
            projectType={project.type}
            credentials={credentials}
          />
        </SettingsCard>

        <ProjectDangerZone project={project} />
      </div>

      {/* Smaller zone: the OAuth callback URL. */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        <SettingsCard
          title={t("projectSettings.callbackUrl.title")}
          description={t("projectSettings.callbackUrl.description")}
          action={
            <SectionEditDialog title={t("projectSettings.callbackUrl.title")}>
              {(close) => (
                <ProjectCallbackUrlSection project={project} onSaved={close} />
              )}
            </SectionEditDialog>
          }
        >
          {project.callbackUrl ? (
            <span className="font-mono text-sm break-all text-foreground">
              {project.callbackUrl}
            </span>
          ) : (
            // Nested-container standard: an inner container inside a bordered
            // card drops its border and reads via the tint fill instead.
            <Alert variant="info" className="border-transparent">
              <InfoIcon />
              <AlertTitle>
                {t("projectSettings.callbackUrl.educationTitle")}
              </AlertTitle>
              <AlertDescription>
                {t("projectSettings.callbackUrl.educationBody")}
              </AlertDescription>
            </Alert>
          )}
        </SettingsCard>
      </div>
    </div>
  );
}

/**
 * One settings card: a bordered panel with a header (title + description on the
 * left, the optional edit action on the right) above the content.
 */
function SettingsCard({
  title,
  description,
  action,
  children,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-heading text-sm font-semibold text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-xs/relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** A read-only label/value line within a card. */
function SettingsField({
  label,
  children,
}: {
  children: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}
