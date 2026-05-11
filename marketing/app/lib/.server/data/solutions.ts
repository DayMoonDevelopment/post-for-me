import { aiContentGeneration } from "./solutions.ai-content-generation";
import { crmSystems } from "./solutions.crm-systems";
import { damTools } from "./solutions.dam-tools";
import { ecommercePlatforms } from "./solutions.e-commerce-platforms";
import { eventManagement } from "./solutions.event-management";
import { games } from "./solutions.games";
import { influencerManagement } from "./solutions.influencer-management";
import { multiAccountManagement } from "./solutions.multi-account-management";
import { newsMediaPublishers } from "./solutions.news-media-publishers";
import { saasProducts } from "./solutions.saas-products";
import { socialMediaScheduler } from "./solutions.social-media-scheduler";

export interface SolutionData {
  id: string;
  nav: {
    title: string;
    description: string;
  };
  meta: {
    title: string;
    description: string;
  };
  hero: {
    headline: string;
    description: string;
  };
  valueProposition: {
    headline: string;
    subheadline: string;
    weHandle: string[];
    youCan: string[];
  };
  coreFeatures: {
    headline: string;
    features: Array<{
      title: string;
      description: string;
    }>;
  };
  developerExperience: {
    headline: string;
    subheadline: string;
    benefits: Array<{
      title: string;
      description: string;
    }>;
  };
}

export const solutions: Record<string, SolutionData> = {
  "social-media-scheduler": socialMediaScheduler,
  "ai-content-generation": aiContentGeneration,
  "multi-account-management": multiAccountManagement,
  games: games,
  "saas-products": saasProducts,
  "e-commerce-platforms": ecommercePlatforms,
  "influencer-management": influencerManagement,
  "crm-systems": crmSystems,
  "dam-tools": damTools,
  "news-media-publishers": newsMediaPublishers,
  "event-management": eventManagement,
};
