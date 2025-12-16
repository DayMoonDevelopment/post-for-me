import type { FormField, SocialProviderConfig } from "./_social-auth-form";

const PERMISSIONS_FIELD: FormField = {
  name: "permissions",
  label: "Permissions",
  type: "multiselect",
  placeholder: "Select permissions",
  description: "Choose which permissions to request for this account",
  required: true,
  options: [
    {
      name: "Posts",
      value: "posts",
      selected: true,
    },
    {
      name: "Feeds",
      value: "feeds",
    },
  ],
};

const EXTERNAL_ID_FIELD: FormField = {
  name: "external_id",
  label: "External ID",
  type: "text",
  placeholder: "external identifier",
  description:
    "An optional external identifier you would like to use for this account",
  required: false,
};

export const PROVIDER_CONFIGS: Record<string, SocialProviderConfig> = {
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    description:
      "Enter your Bluesky handle and app password to connect your account.",
    fields: [
      {
        name: "handle",
        label: "Handle",
        type: "text",
        placeholder: "username.bsky.social",
        description: "Your Bluesky handle (e.g., username.bsky.social)",
        required: true,
      },
      {
        name: "app_password",
        label: "App Password",
        type: "password",
        placeholder: "Enter your app password",
        description:
          "Generate an app password in your <a href='https://bsky.app/settings/app-passwords'>Bluesky settings</a>",
        required: true,
      },
      PERMISSIONS_FIELD,
      EXTERNAL_ID_FIELD,
    ],
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    description: "Choose a connection type to connect your account",
    fields: [
      {
        name: "connection_type",
        required: true,
        label: "Connection Type",
        type: "select",
        placeholder: "choose connection type",
        description:
          "Choose <strong>organization</strong> if using the <strong>Community API</strong>, otherwise choose personal",
        options: [
          {
            name: "personal",
            value: "personal",
          },
          {
            name: "organization",
            value: "organization",
            selected: true,
          },
        ],
      },
      PERMISSIONS_FIELD,
      EXTERNAL_ID_FIELD,
    ],
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    description: "Connect your Facebook account",
    fields: [PERMISSIONS_FIELD, EXTERNAL_ID_FIELD],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    description: "Connect your Instagram account",
    fields: [
      {
        name: "connection_type",
        required: true,
        label: "Connection Type",
        type: "select",
        placeholder: "choose connection type",
        description:
          "Choose <strong>facebook</strong> if using <strong>Instragram With Facebook Login</strong>, otherwise choose <strong>instagram</strong>",
        options: [
          {
            name: "instagram",
            value: "instagram",
            selected: true,
          },
          {
            name: "facebook",
            value: "facebook",
          },
        ],
      },
      PERMISSIONS_FIELD,
      EXTERNAL_ID_FIELD,
    ],
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    description: "Connect your X account",
    fields: [PERMISSIONS_FIELD, EXTERNAL_ID_FIELD],
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    description: "Connect your TikTok account",
    fields: [PERMISSIONS_FIELD, EXTERNAL_ID_FIELD],
  },
  tiktok_business: {
    id: "tiktok_business",
    name: "TikTok Business",
    description: "Connect your TikTok Business account",
    fields: [PERMISSIONS_FIELD, EXTERNAL_ID_FIELD],
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    description: "Connect your YouTube account",
    fields: [PERMISSIONS_FIELD, EXTERNAL_ID_FIELD],
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    description: "Connect your Pinterest account",
    fields: [PERMISSIONS_FIELD, EXTERNAL_ID_FIELD],
  },
  threads: {
    id: "threads",
    name: "Threads",
    description: "Connect your Threads account",
    fields: [PERMISSIONS_FIELD, EXTERNAL_ID_FIELD],
  },
};

export function getProviderConfig(
  providerId: string
): SocialProviderConfig | null {
  return PROVIDER_CONFIGS[providerId] || null;
}

export function getProvidersRequiringAuth(): string[] {
  return Object.keys(PROVIDER_CONFIGS);
}
