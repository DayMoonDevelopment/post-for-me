import { bluesky } from "./integrations.bluesky";
import { facebook } from "./integrations.facebook";
import { instagram } from "./integrations.instagram";
import { linkedin } from "./integrations.linkedin";
import { pinterest } from "./integrations.pinterest";
import { threads } from "./integrations.threads";
import { tiktok } from "./integrations.tiktok";
import { x } from "./integrations.x";
import { youtube } from "./integrations.youtube";

export interface IntegrationCapability {
  title: string;
  description: string;
}

export interface IntegrationConnectionType {
  name: string;
  description: string;
  authMethod: string;
  scopes?: string[];
  notes?: string;
}

export interface IntegrationPostType {
  type: string;
  description: string;
}

export interface PlatformPostConfig {
  name: string;
  field: string;
  description: string;
  appliesTo?: string;
}

export interface IntegrationData {
  id: string;
  name: string;
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
  capabilities: {
    posting: IntegrationCapability;
    feeds: IntegrationCapability;
    analytics: IntegrationCapability;
  };
  connectionTypes: IntegrationConnectionType[];
  postTypes: IntegrationPostType[];
  platformConfigs: PlatformPostConfig[];
  useCases: Array<{
    title: string;
    description: string;
  }>;
}

export const integrations: Record<string, IntegrationData> = {
  tiktok,
  facebook,
  instagram,
  x,
  linkedin,
  pinterest,
  bluesky,
  threads,
  youtube,
};
