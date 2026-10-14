import { useTranslation } from "react-i18next";

import {
  SetupScreen,
  SetupScreenBody,
  SetupScreenHeader,
  SetupScreenPlaceholder,
} from "~/components/setup-screen";
import { DeveloperIcon } from "~/icons";

/**
 * Display-neutral content of the "create your first API key" action — sequenced
 * early so a developer feels value immediately. PLACEHOLDER body for now.
 */
export function ApiKeyContent() {
  const { t } = useTranslation();
  return (
    <SetupScreen data-slot="api-key-content">
      <SetupScreenHeader
        icon={<DeveloperIcon />}
        title={t("setup.apiKey.title")}
        description={t("setup.apiKey.description")}
      />
      <SetupScreenBody>
        <SetupScreenPlaceholder>
          {t("setup.apiKey.placeholder")}
        </SetupScreenPlaceholder>
      </SetupScreenBody>
    </SetupScreen>
  );
}
