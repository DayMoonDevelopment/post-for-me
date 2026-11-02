import { useEffect } from "react";
import { toast } from "sonner";

import { isActionError } from "~/lib/action-result";

/**
 * Standard interaction-error display for `api.*` fetcher calls: watch a fetcher's
 * result and toast when it returns an {@link ActionError}. (Navigations use the
 * flash channel in `~/lib/.server/flash` instead — see the routes README.)
 *
 *   const fetcher = useFetcher();
 *   useActionErrorToast(fetcher);
 */
export function useActionErrorToast(fetcher: { data: unknown }) {
  const data = fetcher.data;
  useEffect(() => {
    if (isActionError(data)) toast.error(data.error);
  }, [data]);
}
