import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";
import { toast } from "sonner";

import { isActionError } from "~/lib/action-result";

/**
 * Shared submit plumbing for a project-config section. Returns a fetcher (post
 * its `Form` / `submit` to `/projects/:id/settings`), the pending flag, and the
 * action path. Toasts on the standard {@link isActionError} result and on a
 * successful save — so every section behaves identically whether it's framed as
 * a settings-page card or a setup-modal slide.
 *
 * `onSaved` fires once on each successful save — the settings page passes it to
 * close the section's edit dialog. Held in a ref so passing a fresh inline arrow
 * each render doesn't re-fire it (the effect keys only on the fetcher result).
 */
export function useSectionSave(projectId: string, onSaved?: () => void) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const data = fetcher.data;

  const onSavedRef = React.useRef(onSaved);
  React.useEffect(() => {
    onSavedRef.current = onSaved;
  });

  React.useEffect(() => {
    if (isActionError(data)) {
      toast.error(data.error);
    } else if (data && (data as { ok?: boolean }).ok) {
      toast.success(t("projectSettings.saved"));
      onSavedRef.current?.();
    }
  }, [data, t]);

  return {
    fetcher,
    pending: fetcher.state !== "idle",
    action: `/projects/${projectId}/settings`,
  };
}
