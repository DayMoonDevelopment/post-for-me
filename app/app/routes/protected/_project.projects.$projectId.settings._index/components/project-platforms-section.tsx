import * as React from "react";
import { useTranslation } from "react-i18next";

import type { BrandReadiness } from "~/lib/brand-readiness";
import type { ProviderCredentialStatus } from "~/lib/onboarding";
import type { ProjectType } from "~/lib/types/project";

import {
  PlatformAvatar,
  PlatformAvatarBadge,
  PlatformAvatarStatusBadge,
} from "~/components/platform-avatar";
import { credentialsByProvider, resolveBrands } from "~/lib/brand-readiness";
import { brandProvider } from "~/lib/platform-meta";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import { StatusIndicator, type StatusName } from "~/ui/status-indicator";

import { PlatformConfigureDialog } from "./platform-configure-dialog";

/**
 * The dot is BINARY — ready or not. A platform that's half-configured is not
 * ready, and saying so in three colors asked the reader to decode a legend for
 * a distinction the row's sublabel already spells out in words.
 */
const STATE_STATUS: Record<BrandReadiness["state"], StatusName> = {
  idle: "default",
  setup: "default",
  done: "success",
};

/**
 * The project's platforms — one row per BRAND (never one per `social_provider`,
 * which would split Instagram and TikTok away from their own connection
 * methods): a ready/not-ready status dot and ONE action, Configure.
 *
 * There is deliberately no separate Enable step. Enablement is what saving the
 * configure sheet does, so a platform can't sit in the on-but-unusable state
 * that a bare "enable" would create. Quickstart and white-label share this UI
 * exactly; only the sheet's contents differ (white-label collects developer
 * keys, quickstart rides Post for Me's shared credentials). Both persist through
 * the same `platform_config` intent.
 */
export function ProjectPlatformsSection({
  projectId,
  projectType,
  credentials,
}: {
  /** Per-provider presence booleans. NEVER the values — see the settings
   * loader; the sheet fetches those on demand when a member edits. */
  credentials: ProviderCredentialStatus[];
  projectId: string;
  projectType: ProjectType;
}) {
  // Stable identity: the configure sheet re-seeds its draft whenever this map
  // changes, so rebuilding it on every render would wipe an in-progress edit.
  const byProvider = React.useMemo(
    () => credentialsByProvider(credentials),
    [credentials],
  );
  // Memoized for the same reason as `byProvider`: `resolveBrands` builds fresh
  // readiness objects, which flow into the configure sheet's re-seed effect —
  // rebuilding them each render would discard an edit in progress.
  const brands = React.useMemo(
    () => resolveBrands(credentials, projectType),
    [credentials, projectType],
  );

  return (
    <ul className="flex flex-col -mb-3">
      {brands.map((readiness, index) => (
        <PlatformRow
          key={readiness.brand.id}
          projectId={projectId}
          projectType={projectType}
          readiness={readiness}
          credentials={byProvider}
          divided={index > 0}
        />
      ))}
    </ul>
  );
}

function PlatformRow({
  projectId,
  projectType,
  readiness,
  credentials,
  divided,
}: {
  credentials: Map<ProviderCredentialStatus["provider"], ProviderCredentialStatus>;
  divided: boolean;
  projectId: string;
  projectType: ProjectType;
  readiness: BrandReadiness;
}) {
  const { t } = useTranslation();
  const { brand, state } = readiness;

  return (
    <li className="flex items-center gap-3">
      <PlatformAvatar platform={brandProvider(brand.id)} size="sm">
        <PlatformAvatarBadge>
          {/* On a card, so the knockout ring matches `card`, overridden
              through the badge's own child selector. */}
          <PlatformAvatarStatusBadge className="[&_[data-slot=status-indicator]]:ring-card">
            <StatusIndicator
              status={STATE_STATUS[state]}
              aria-label={t(`projectSettings.platforms.state.${state}`)}
            />
          </PlatformAvatarStatusBadge>
        </PlatformAvatarBadge>
      </PlatformAvatar>
      {/* Apple-style inset separator: the divider lives on the content
          column (border-t here) rather than the whole row, so it starts at
          the label and leaves the area beneath the avatar open. */}
      <div
        className={cn(
          "flex flex-1 items-center gap-3 py-3",
          divided && "border-t border-border",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {brand.label}
          </span>
          <RowSublabel readiness={readiness} />
        </div>
        {/* ONE action per row. Enablement isn't a separate step — it's what
            saving the configure sheet does, so a platform is never left on but
            unusable. */}
        <PlatformConfigureDialog
          projectId={projectId}
          projectType={projectType}
          readiness={readiness}
          credentials={credentials}
          trigger={
            <Button
              type="button"
              // A platform still needing attention invites the click; a working
              // one offers a quiet way back in.
              variant={state === "done" ? "ghost" : "secondary"}
              size="sm"
            >
              {t("projectSettings.platforms.configure")}
            </Button>
          }
        />
      </div>
    </li>
  );
}

/**
 * What the row reports under the brand name — the platform's own state in the
 * user's terms, never a provider id. A platform still needing keys says so; a
 * working one names its connection methods, but only where there was a choice
 * to make (elsewhere it would just echo the brand name).
 */
function RowSublabel({ readiness }: { readiness: BrandReadiness }) {
  const { t } = useTranslation();
  const { brand, enabled, state } = readiness;

  const text =
    state === "setup"
      ? t("projectSettings.platforms.state.setup")
      : state === "done" && brand.variants.length > 1
        ? enabled.map((variant) => variant.optionLabel).join(" · ")
        : null;

  if (!text) return null;
  return (
    <span
      className={cn(
        "truncate text-xs",
        state === "setup" ? "text-warning-foreground" : "text-muted-foreground",
      )}
    >
      {text}
    </span>
  );
}
