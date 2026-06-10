import { google } from "googleapis";

import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";

interface GoogleBusinessAccount {
  name: string;
  accountName?: string;
  type?: string;
  role?: string;
}

interface GoogleBusinessLocation {
  name: string;
  title?: string;
  metadata?: {
    mapsUri?: string;
    newReviewUri?: string;
  };
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
}

export async function getGoogleBusinessProfileSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const oauth2Client = new google.auth.OAuth2(
    appCredentials.appId!,
    appCredentials.appSecret!,
    redirectUri,
  );
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    console.error("Error fetching Google Business Profile access token", tokens);
    throw Error("Error fetching access token");
  }

  const accounts = await fetchGoogleBusinessAccounts(tokens.access_token);
  const connections: SocialProviderConnection[] = [];

  for (const account of accounts) {
    const locations = await fetchGoogleBusinessLocations(
      tokens.access_token,
      account.name,
    );

    connections.push(
      ...locations.map((location) => ({
        social_provider_user_id: getLocationResourceName(account, location),
        social_provider_user_name: location.title || account.accountName || "",
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token ?? undefined,
        access_token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
        social_provider_metadata: {
          account_name: account.name,
          account_display_name: account.accountName,
          location_name: location.name,
          maps_uri: location.metadata?.mapsUri,
          new_review_uri: location.metadata?.newReviewUri,
          address: location.storefrontAddress,
          connection_type: "location",
        },
      })),
    );
  }

  return connections;
}

async function fetchGoogleBusinessAccounts(
  accessToken: string,
): Promise<GoogleBusinessAccount[]> {
  const accounts: GoogleBusinessAccount[] = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams();

    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const response = await fetch(
      `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const data = await response.json();

    if (!response.ok) {
      console.error("Error fetching Google Business Profile accounts", data);
      throw Error("Error fetching Google Business Profile accounts");
    }

    accounts.push(...(data.accounts || []));
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return accounts.filter((account) => account.name);
}

async function fetchGoogleBusinessLocations(
  accessToken: string,
  accountName: string,
): Promise<GoogleBusinessLocation[]> {
  const locations: GoogleBusinessLocation[] = [];
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams([
      ["readMask", "name,title,metadata,storefrontAddress"],
    ]);

    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const response = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const data = await response.json();

    if (!response.ok) {
      console.error("Error fetching Google Business Profile locations", data);
      throw Error("Error fetching Google Business Profile locations");
    }

    locations.push(...(data.locations || []));
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return locations.filter((location) => location.name);
}

function getLocationResourceName(
  account: GoogleBusinessAccount,
  location: GoogleBusinessLocation,
) {
  return location.name.startsWith("accounts/")
    ? location.name
    : `${account.name}/${location.name}`;
}
