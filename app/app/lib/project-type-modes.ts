import type { TranslationKey } from "~/lib/i18n/config";
import type { ProjectType } from "~/lib/types/project";

import { RocketIcon, TagIcon } from "~/icons";

/** The two project-type choices, as presented to a user picking one: an icon,
 * and title/description i18n keys. `data-brand` (applied by each consumer's
 * card) re-points `--primary` per type, so quickstart and white-label read as
 * visibly different without hard-coded colors. Shared by every project-type
 * picker (onboarding's `ProjectTypeSlide`, the new-project dialog) so they
 * can't drift apart in copy or ordering. */
export const PROJECT_TYPE_MODES: {
  descriptionKey: TranslationKey;
  icon: typeof RocketIcon;
  id: ProjectType;
  titleKey: TranslationKey;
}[] = [
  {
    id: "quickstart",
    icon: RocketIcon,
    titleKey: "onboarding.project.quickstart.title",
    descriptionKey: "onboarding.project.quickstart.description",
  },
  {
    id: "white-label",
    icon: TagIcon,
    titleKey: "onboarding.project.whiteLabel.title",
    descriptionKey: "onboarding.project.whiteLabel.description",
  },
];
