import type { ComponentType } from "react";

import type { TranslationKey } from "~/lib/i18n/config";
import type { OnboardingSegment } from "~/lib/onboarding";

import {
  AccountIcon,
  AiAgentIcon,
  DeveloperIcon,
  MarketingIcon,
  MoreIcon,
} from "~/icons";

/**
 * Per-segment metadata for the "What are you building?" tiles (`SegmentSlide`).
 * One source of truth for each segment's icon + copy.
 */
export type SegmentMeta = {
  descriptionKey: TranslationKey;
  icon: ComponentType<{ className?: string }>;
  id: OnboardingSegment;
  titleKey: TranslationKey;
};

export const SEGMENTS: SegmentMeta[] = [
  {
    id: "saas",
    icon: DeveloperIcon,
    titleKey: "onboarding.segments.saas.title",
    descriptionKey: "onboarding.segments.saas.description",
  },
  {
    id: "agent",
    icon: AiAgentIcon,
    titleKey: "onboarding.segments.agent.title",
    descriptionKey: "onboarding.segments.agent.description",
  },
  {
    id: "marketing",
    icon: MarketingIcon,
    titleKey: "onboarding.segments.marketing.title",
    descriptionKey: "onboarding.segments.marketing.description",
  },
  {
    id: "personal",
    icon: AccountIcon,
    titleKey: "onboarding.segments.personal.title",
    descriptionKey: "onboarding.segments.personal.description",
  },
  {
    id: "other",
    icon: MoreIcon,
    titleKey: "onboarding.segments.other.title",
    descriptionKey: "onboarding.segments.other.description",
  },
];
