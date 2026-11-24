import { useLoaderData } from "react-router";

import type { ConnectionResultData } from "~/lib/types/connection-result";

import { ConnectionResult } from "~/components/connection-result";

// White Label fallback UI (project has no auth_callback_url). The shared
// component renders the branded success / failure result.
export function Component() {
  const data = useLoaderData<ConnectionResultData>();
  return <ConnectionResult data={data} />;
}
