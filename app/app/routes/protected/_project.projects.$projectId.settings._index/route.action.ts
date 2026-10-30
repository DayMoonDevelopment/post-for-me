import { redirect } from "react-router";

import { logError } from "~/lib/.server/errors";
import { servicesContext } from "~/lib/.server/services";
import { actionError } from "~/lib/action-result";
import { getServerT } from "~/lib/i18n/i18n.server";
import {
  isOnboardingPlatform,
  isSocialProvider,
  type OnboardingPlatform,
  parseOnboardingCredentials,
  type SocialProvider,
} from "~/lib/onboarding";
// The pure brand topology, NOT `~/lib/platform-meta` — that one carries the
// React icon registry, which has no place in a server action.
import {
  BRAND_SPECS,
  brandProviders,
  brandSpec,
  recommendedVariantSpec,
} from "~/lib/platform-brands";

import type { Route } from "./+types/route";

import {
  projectCallbackUrlSchema,
  projectNameSchema,
} from "./schemas/settings.schema";

/** Parse the comma-joined platform ids from a `platforms` field. */
function parsePlatforms(raw: FormDataEntryValue | null): OnboardingPlatform[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  return raw.split(",").filter(isOnboardingPlatform);
}

/**
 * `POST /projects/:projectId/settings` — the single mutation surface for project
 * config, shared by the settings page forms AND the project-setup modal. Each
 * `intent` maps to one section; failures return a toastable {@link actionError}
 * (recoverable) rather than throwing to the boundary. RLS scopes every write.
 *
 * Platforms persistence: the project's configured platforms ARE its white-label
 * `social_provider_app_credentials` rows, so selecting/deselecting platforms
 * adds/removes (empty-keyed) rows; the credentials intent fills the keys.
 */
export async function action({ request, params, context }: Route.ActionArgs) {
  const t = await getServerT(request);
  const projectId = params.projectId;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const { projects, providerCredentials } = context.get(servicesContext);

  try {
    if (intent === "name") {
      const parsed = projectNameSchema.safeParse({ name: form.get("name") });
      if (!parsed.success) {
        return actionError(t("projectSettings.errors.name"));
      }
      await projects.update(projectId, { name: parsed.data.name });
      return { ok: true };
    }

    if (intent === "callback_url") {
      const parsed = projectCallbackUrlSchema.safeParse({
        callbackUrl: form.get("callbackUrl"),
      });
      if (!parsed.success) {
        return actionError(t("projectSettings.errors.callbackUrl"));
      }
      // Empty clears the column.
      await projects.update(projectId, {
        callbackUrl: parsed.data.callbackUrl || null,
      });
      return { ok: true };
    }

    if (intent === "platforms") {
      // The BRAND-level platform picker (onboarding + the project-setup modal),
      // which deals in base brands only. "Configured platforms" = the project's
      // credential rows, so reconcile the selected brands against what exists.
      //
      // A brand can own more than one provider row (Instagram and TikTok each
      // have two connection methods), so this works per brand rather than per
      // provider: a newly selected brand gets its RECOMMENDED method — matching
      // what the settings page's Enable writes — while a brand that's already on
      // keeps whatever methods were chosen there, and deselecting drops all of
      // that brand's rows.
      const selected = parsePlatforms(form.get("platforms"));
      const selectedBrands = new Set<OnboardingPlatform>(selected);
      // Enablement only — which rows EXIST, never their secrets. Quickstart
      // projects ride Post for Me's shared credentials, and `list()` reads the
      // secret columns, so a reconcile must go through the secret-free read.
      const existingSet = new Set(
        await providerCredentials.listEnabledProviders(projectId),
      );

      const toAdd: { appId: string; appSecret: string; provider: SocialProvider }[] =
        [];
      const toRemove: SocialProvider[] = [];
      for (const brand of BRAND_SPECS) {
        const owned = brandProviders(brand);
        if (selectedBrands.has(brand.id)) {
          if (!owned.some((provider) => existingSet.has(provider))) {
            toAdd.push({
              provider: recommendedVariantSpec(brand).id,
              appId: "",
              appSecret: "",
            });
          }
        } else {
          toRemove.push(...owned.filter((provider) => existingSet.has(provider)));
        }
      }
      await providerCredentials.upsert(projectId, toAdd);
      await providerCredentials.remove(projectId, toRemove);
      return { ok: true };
    }

    if (intent === "credentials") {
      const credentials = parseOnboardingCredentials(form.get("credentials"));
      await providerCredentials.upsert(projectId, credentials);
      return { ok: true };
    }

    if (intent === "platform_config") {
      // Brand-level reconcile. The settings page presents ONE row per brand
      // ("Instagram"), but Instagram and TikTok each span two `social_provider`
      // rows — one per connection method. The client sends the brand plus the
      // variants it should end up with; we reconcile within that brand only, so
      // this never touches another platform's rows. An empty `variants` disables
      // the brand outright.
      const brand = brandSpec(String(form.get("brand") ?? ""));
      if (!brand) {
        return actionError(t("projectSettings.errors.generic"));
      }
      const owned = brandProviders(brand);
      const selected = String(form.get("variants") ?? "")
        .split(",")
        .filter(isSocialProvider)
        // Guard the reconcile: only this brand's own variants are in scope.
        .filter((provider) => owned.includes(provider));
      const selectedSet = new Set<SocialProvider>(selected);

      // Enablement only — see the `platforms` intent: this must never read the
      // secret columns, since Quickstart projects reach it too.
      const existingSet = new Set(
        await providerCredentials.listEnabledProviders(projectId),
      );
      const toAdd = selected
        .filter((provider) => !existingSet.has(provider))
        .map((provider) => ({ provider, appId: "", appSecret: "" }));
      const toRemove = owned.filter(
        (provider) => existingSet.has(provider) && !selectedSet.has(provider),
      );
      // Enabling means something different per project type. White-label writes
      // an empty row the member then keys; Quickstart can't write these rows at
      // all through the user client (RLS denies system projects), so the server
      // copies Post for Me's shared keys onto the project instead.
      const isSystem = (await projects.get(projectId)).type === "quickstart";
      if (isSystem) {
        const unavailable = await providerCredentials.enableFromSystem(
          projectId,
          toAdd.map((row) => row.provider),
        );
        if (unavailable.length > 0) {
          return actionError(
            t("projectSettings.errors.platformUnavailable", {
              platform: brand.label,
            }),
          );
        }
      } else {
        await providerCredentials.upsert(projectId, toAdd);
      }
      await providerCredentials.remove(projectId, toRemove);

      // Keys ride the same submit so switching a variant on and filling its
      // developer app is one save, not two round trips. Blank fields merge onto
      // the stored row (see the service's upsert), so this never wipes keys.
      // Quickstart never sends any — its keys are Post for Me's, not the
      // member's — so this stays a white-label-only write.
      if (!isSystem) {
        const credentials = parseOnboardingCredentials(
          form.get("credentials"),
        ).filter((credential) => selectedSet.has(credential.provider));
        await providerCredentials.upsert(projectId, credentials);
      }
      return { ok: true };
    }

    if (intent === "delete") {
      // Destructive + irreversible — the danger-zone dialog gates this behind a
      // type-the-name confirmation. Off to the dashboard home; the deleted
      // project drops out of the switcher on revalidation.
      await projects.remove(projectId);
      return redirect("/");
    }

    return actionError(t("projectSettings.errors.generic"));
  } catch (error) {
    // Normalize + structured-log (kind + context + cause) via the error
    // framework, but keep the LOCALIZED user copy — the framework's default
    // messages aren't i18n'd, so routes that localize own their toast text.
    logError(error, { intent, projectId });
    return actionError(t("projectSettings.errors.generic"));
  }
}
