import type {
  SocialProviderConnection,
  SocialProviderInfo,
} from "../social-account.types";

export async function getLinkedInSocialProviderConnection({
  redirectUri,
  request,
  appCredentials,
}: SocialProviderInfo): Promise<SocialProviderConnection[]> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");

  if (!code) {
    throw Error("No code provided");
  }

  const tokenUrl = `https://www.linkedin.com/oauth/v2/accessToken`;
  const tokenParams = new URLSearchParams([
    ["grant_type", "authorization_code"],
    ["client_id", appCredentials.appId!],
    ["client_secret", appCredentials.appSecret!],
    ["redirect_uri", redirectUri],
    ["code", code],
  ]);
  const tokenResponse = await fetch(`${tokenUrl}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenParams,
  });

  const tokenData = await tokenResponse.json();

  const accessToken = tokenData.access_token;
  const accessTokenExpiresAt: Date = new Date(
    Date.now() + (tokenData.expires_in - 86400) * 1000
  );
  const refreshToken = tokenData.refresh_token;
  const refreshTokenExpiresAt: Date | undefined =
    tokenData.refresh_token_expires_in
      ? new Date(Date.now() + tokenData.refresh_token_expires_in * 1000)
      : undefined;

  const profileData = await getProfileData(accessToken);

  const accounts: SocialProviderConnection[] = [
    {
      access_token: accessToken,
      access_token_expires_at: accessTokenExpiresAt,
      social_provider_user_id: profileData.id,
      social_provider_user_name: profileData.name,
      refresh_token: refreshToken,
      refresh_token_expires_at: refreshTokenExpiresAt,
      social_provider_photo_url: profileData.pictureUrl,
    },
  ];

  const pageAccounts = await getPageAccounts(
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt
  );

  accounts.push(...pageAccounts);

  return accounts;
}

async function getProfileData(
  accessToken: string
): Promise<{ name: string; pictureUrl: string; id: string }> {
  const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (userResponse.ok) {
    const userData = await userResponse.json();
    return {
      name: userData.name,
      pictureUrl: userData.picture,
      id: userData.sub,
    };
  }

  const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const profileData = await profileResponse.json();

  const pictureResponse = await fetch(
    "https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~digitalmediaAsset:playableStreams))",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  const pictureData = await pictureResponse.json();

  const profilePictureUrl =
    pictureData.profilePicture?.["displayImage~"]?.elements
      ?.filter(
        (element: {
          data?: {
            "com.linkedin.digitalmedia.mediaartifact.StillImage"?: {
              storageSize?: { width: number };
            };
          };
        }) =>
          element.data?.["com.linkedin.digitalmedia.mediaartifact.StillImage"]
            ?.storageSize?.width
      )
      ?.sort(
        (
          a: {
            data: {
              "com.linkedin.digitalmedia.mediaartifact.StillImage"?: {
                storageSize?: { width: number };
              };
            };
          },
          b: {
            data: {
              "com.linkedin.digitalmedia.mediaartifact.StillImage"?: {
                storageSize?: { width: number };
              };
            };
          }
        ) => {
          const widthA =
            a.data["com.linkedin.digitalmedia.mediaartifact.StillImage"]
              ?.storageSize?.width || 0;
          const widthB =
            b.data["com.linkedin.digitalmedia.mediaartifact.StillImage"]
              ?.storageSize?.width || 0;
          return widthB - widthA;
        }
      )?.[0]?.identifiers?.[0]?.identifier || null;

  return {
    name: `${profileData.localizedFirstName || ""} ${profileData.localizedLastName || ""}`.trim(),
    pictureUrl: profilePictureUrl,
    id: profileData.id,
  };
}

async function getPageAccounts(
  accessToken: string,
  refreshToken: string,
  accessTokenExpiresAt: Date,
  refreshTokenExpiresAt: Date | undefined
): Promise<SocialProviderConnection[]> {
  const accounts: SocialProviderConnection[] = [];
  const roles = ["ADMINISTRATOR", "CONTENT_ADMINISTRATOR"];

  const responses = await Promise.all(
    roles.map(async (role) => {
      const pageResponse = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=${role}&state=APPROVED`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      if (!pageResponse.ok) {
        return [];
      }

      const data = await pageResponse.json();

      return data.elements ?? [];
    })
  );

  const elements: { organizationalTarget: string }[] = [
    ...new Map(
      responses
        .flat()
        .map((element: { organizationalTarget: string }) => [
          element.organizationalTarget,
          element,
        ])
    ).values(),
  ];

  if (elements.length === 0) {
    return accounts;
  }

  await Promise.all(
    elements.map(async (element: { organizationalTarget: string }) => {
      try {
        const orgId = element.organizationalTarget.split(":").pop();

        if (!orgId) {
          return;
        }

        const orgResponse = await fetch(
          `https://api.linkedin.com/v2/organizations/${orgId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-Restli-Protocol-Version": "2.0.0",
            },
          }
        );

        const orgData = await orgResponse.json();

        // Get organization picture
        const pictureResponse = await fetch(
          `https://api.linkedin.com/v2/organizations/${orgId}?projection=(id,vanityName,localizedName,logoV2(original~digitalmediaAsset:playableStreams))`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-Restli-Protocol-Version": "2.0.0",
            },
          }
        );

        const pictureData = await pictureResponse.json();

        // Extract highest quality logo URL
        const logoUrl =
          pictureData.logoV2?.["original~"]?.elements
            ?.filter(
              (element: {
                data?: {
                  "com.linkedin.digitalmedia.mediaartifact.StillImage"?: {
                    storageSize?: { width: number };
                  };
                };
              }) =>
                element.data?.[
                  "com.linkedin.digitalmedia.mediaartifact.StillImage"
                ]?.storageSize?.width
            )
            ?.sort(
              (
                a: {
                  data: {
                    "com.linkedin.digitalmedia.mediaartifact.StillImage"?: {
                      storageSize?: { width: number };
                    };
                  };
                },
                b: {
                  data: {
                    "com.linkedin.digitalmedia.mediaartifact.StillImage"?: {
                      storageSize?: { width: number };
                    };
                  };
                }
              ) => {
                const widthA =
                  a.data["com.linkedin.digitalmedia.mediaartifact.StillImage"]
                    ?.storageSize?.width || 0;
                const widthB =
                  b.data["com.linkedin.digitalmedia.mediaartifact.StillImage"]
                    ?.storageSize?.width || 0;
                return widthB - widthA;
              }
            )?.[0]?.identifiers?.[0]?.identifier || null;

        accounts.push({
          social_provider_user_id: orgId,
          social_provider_user_name: orgData.localizedName,
          social_provider_metadata: { connection_type: "page" },
          social_provider_photo_url: logoUrl,
          access_token: accessToken,
          access_token_expires_at: accessTokenExpiresAt,
          refresh_token: refreshToken,
          refresh_token_expires_at: refreshTokenExpiresAt,
        });
      } catch (error) {
        console.error("Error fetching organization:", error);
      }
    })
  );

  return accounts;
}
