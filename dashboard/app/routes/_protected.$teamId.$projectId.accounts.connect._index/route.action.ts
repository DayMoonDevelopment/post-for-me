import { redirect } from "react-router";
import { withDashboardKey } from "~/lib/.server/api/api";
import { API_URL } from "~/lib/.server/api/api.constants";
import { withSupabase } from "~/lib/.server/supabase";
import {
  getProviderConfig,
  getProvidersRequiringAuth,
} from "./_provider-configs";

export const action = withSupabase(
  withDashboardKey(async ({ request, params, apiKey }) => {
    const formData = await request.formData();

    const provider = formData.get("provider") as string;

    const errors: string[] = [];
    if (!apiKey) {
      errors.push("No API Key");
    }

    if (!provider) {
      errors.push("No Provider");
    }

    const providersRequiringAuth = getProvidersRequiringAuth();
    const requiresCustomAuth = providersRequiringAuth.includes(provider);
    const providerConfig = getProviderConfig(provider);

    // Validate provider-specific fields for providers requiring custom auth
    if (requiresCustomAuth && providerConfig) {
      for (const field of providerConfig.fields) {
        if (field.required !== false) {
          const value = formData.get(field.name) as string;
          if (!value || value.trim() === "") {
            errors.push(
              `${field.label} is required for ${providerConfig.name}`
            );
          }
        }
      }
    }

    if (errors && errors.length > 0) {
      // For providers requiring custom auth, return error for useForm hook
      if (requiresCustomAuth) {
        return {
          success: false,
          toast_msg: errors.join(", "),
          errors: errors.reduce(
            (acc, error, index) => {
              acc[`error_${index}`] = error;
              return acc;
            },
            {} as Record<string, string>
          ),
        };
      }

      return redirect(
        `/${params.teamId}/${params.projectId}/accounts/connect?error=${errors.join(",")}`
      );
    }

    // Prepare request body
    const requestBody: {
      platform: string;
      platform_data?: Record<string, unknown>;
      external_id?: string;
    } = {
      platform: provider.toLowerCase(),
    };

    // Add provider_data for providers requiring custom auth
    if (requiresCustomAuth && providerConfig) {
      const providerData: Record<string, unknown> = {};

      for (const field of providerConfig.fields.filter(
        (f) => f.name !== "external_id"
      )) {
        const value = formData.get(field.name) as string;
        if (value) {
          // Handle special field transformations if needed
          if (field.name === "headers" && field.type === "textarea") {
            try {
              providerData[field.name] = JSON.parse(value);
            } catch {
              providerData[field.name] = value;
            }
          } else {
            providerData[field.name] = value;
          }
        }
      }

      if (Object.keys(providerData).length > 0) {
        requestBody.platform_data = {
          [provider]: providerData,
        };
      }
    }

    const externalId = formData.get("external_id") as string;

    if (externalId) {
      requestBody.external_id = externalId;
    }

    const response = await fetch(`${API_URL}/v1/social-accounts/auth-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);

      return redirect(
        `/${params.teamId}/${params.projectId}/accounts/connect?error=Connection failed`
      );
    }

    const responseData = await response.json();

    return redirect(responseData.url);
  })
);
