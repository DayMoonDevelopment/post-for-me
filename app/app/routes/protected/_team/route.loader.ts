import { loadShellData } from "~/lib/.server/shell";

import type { Route } from "./+types/route";

/**
 * The team shell's data is exactly the shared shell data — nothing team-context
 * specific yet. No onboarding flag (unlike `_project`): onboarding configures a
 * PROJECT, so this shell never mounts the provider.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  return loadShellData(request, context);
}
