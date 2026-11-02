import type * as React from "react";

import { useTranslation } from "react-i18next";

import { useOptionalSetupContext } from "~/components/setup-context";
import {
  SetupScreen,
  SetupScreenBody,
  SetupScreenHeader,
  SetupScreenPlaceholder,
} from "~/components/setup-screen";
import { EditIcon, SettingsIcon } from "~/icons";
import { Button } from "~/ui/button";

/**
 * "Finish setting up your project" — the consolidated configuration step. Folds
 * what used to be separate callback-url and credentials steps into one screen so
 * the checklist reads as 5 approachable steps, not 6. Sections:
 *
 *  - Platforms — review/update the platforms chosen during onboarding.
 *  - Callback URL — OPTIONAL OAuth callback, for every project type.
 *  - Developer credentials — REQUIRED, white-label only (read from setup context
 *    so a quickstart project never sees it).
 *
 * Display-neutral (consumed by both the tour slide and the standalone dialog).
 * PLACEHOLDER bodies for now — the real platform editor / URL field / credential
 * form get built in place later.
 */
export function ProjectConfigContent() {
  const { t } = useTranslation();
  const ctx = useOptionalSetupContext();
  const isWhiteLabel = ctx?.projectType === "white-label";

  return (
    <SetupScreen data-slot="project-config-content">
      <SetupScreenHeader
        icon={<SettingsIcon />}
        title={t("setup.configureProject.title")}
        description={t("setup.configureProject.description")}
      />
      <SetupScreenBody>
        <ConfigSection
          title={t("setup.configureProject.platforms.label")}
          description={t("setup.configureProject.platforms.description")}
          action={
            <Button variant="outline" size="sm">
              <EditIcon />
              {t("common.edit")}
            </Button>
          }
        >
          <SetupScreenPlaceholder className="min-h-16">
            {t("setup.configureProject.platforms.placeholder")}
          </SetupScreenPlaceholder>
        </ConfigSection>

        <ConfigSection
          title={t("setup.configureProject.callbackUrl.label")}
          badge={t("setup.configureProject.callbackUrl.optional")}
          description={t("setup.configureProject.callbackUrl.description")}
        >
          <SetupScreenPlaceholder className="min-h-16">
            {t("setup.configureProject.callbackUrl.placeholder")}
          </SetupScreenPlaceholder>
        </ConfigSection>

        {isWhiteLabel ? (
          <ConfigSection
            title={t("setup.configureProject.credentials.label")}
            description={t("setup.configureProject.credentials.description")}
          >
            <SetupScreenPlaceholder className="min-h-16">
              {t("setup.configureProject.credentials.placeholder")}
            </SetupScreenPlaceholder>
          </ConfigSection>
        ) : null}
      </SetupScreenBody>
    </SetupScreen>
  );
}

/** One labeled config section: a heading row (title + optional badge +
 * description + optional action) above its body. */
function ConfigSection({
  title,
  description,
  badge,
  action,
  children,
}: {
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{title}</span>
            {badge ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? (
            <span className="text-xs/relaxed text-muted-foreground">
              {description}
            </span>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
