import type { SocialProviderConfig } from "./_social-auth-form";

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
    ],
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
