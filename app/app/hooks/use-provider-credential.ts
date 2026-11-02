import * as React from "react";

/**
 * Fetch ONE provider's developer app id + secret, on demand.
 *
 * Credential values are deliberately absent from every page loader — see
 * `api.projects.$projectId.credentials`. A surface that genuinely needs them
 * (the edit form, and only once the member asks to edit) pulls them through
 * this hook, which hits that dedicated endpoint with a plain `fetch`.
 *
 * Pass `enabled: false` to hold off, and the hook drops whatever it was holding
 * — so leaving edit mode clears the secret out of component state rather than
 * parking it there for the rest of the session.
 *
 * Quickstart projects get `null`: the endpoint 404s for them by design.
 */
export function useProviderCredential({
  projectId,
  provider,
  enabled,
}: {
  enabled: boolean;
  projectId: string;
  provider: string;
}) {
  const [credential, setCredential] = React.useState<{
    appId: string;
    appSecret: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) {
      setCredential(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(
      `/api/projects/${encodeURIComponent(projectId)}/credentials?provider=${encodeURIComponent(provider)}`,
      { signal: controller.signal, credentials: "same-origin" },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setCredential(data))
      .catch(() => {
        // Aborted or failed — leave the fields blank rather than half-filled.
        // Saving blanks is a no-op server-side (the upsert merges), so an
        // unreachable reveal can't silently wipe stored keys.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [projectId, provider, enabled]);

  return { credential, loading };
}
