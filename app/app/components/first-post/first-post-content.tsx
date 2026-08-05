import { useTranslation } from "react-i18next";

import {
  SetupScreen,
  SetupScreenBody,
  SetupScreenHeader,
  SetupScreenPlaceholder,
} from "~/components/setup-screen";
import { SendIcon } from "~/icons";

/**
 * Display-neutral content of the "publish your first post" action — the final
 * setup step, the payoff. PLACEHOLDER body for now.
 */
export function FirstPostContent() {
  const { t } = useTranslation();
  return (
    <SetupScreen data-slot="first-post-content">
      <SetupScreenHeader
        icon={<SendIcon />}
        title={t("setup.firstPost.title")}
        description={t("setup.firstPost.description")}
      />
      <SetupScreenBody>
        <SetupScreenPlaceholder>
          {t("setup.firstPost.placeholder")}
        </SetupScreenPlaceholder>
      </SetupScreenBody>
    </SetupScreen>
  );
}
