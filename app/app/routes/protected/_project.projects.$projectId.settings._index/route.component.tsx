import { useTranslation } from "react-i18next";
import { useLoaderData } from "react-router";

import type { loader } from "./route.loader";

import { ProjectSettingsView } from "./components/project-settings-view";

/**
 * The project settings page — a calm, full-bleed read-only display of the
 * project's configuration. The shared config-section forms now live behind
 * per-section edit dialogs ({@link ProjectSettingsView}); the page itself just
 * shows values. NOTE: no page-level `data-brand` — the project-type namespace
 * recolors `--primary`, which is reserved for interactive elements, so it stays
 * scoped to non-interactive type indicators (badge, type avatar), never the page.
 */
export function Component() {
  const { t } = useTranslation();
  const { project, credentials } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("projectSettings.pageTitle")}
        </h1>
        <p className="text-sm/relaxed text-muted-foreground">
          {t("projectSettings.pageDescription")}
        </p>
      </div>

      <ProjectSettingsView project={project} credentials={credentials} />
    </div>
  );
}
