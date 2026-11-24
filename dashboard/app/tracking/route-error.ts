import { safeErrorDetails, type RouteErrorCode } from "~/lib/route-errors";

export async function reportRouteError({
  error,
  code,
  referenceId,
  pathname,
  teamId,
  projectId,
}: {
  error: unknown;
  code: RouteErrorCode;
  referenceId: string;
  pathname: string;
  teamId?: string;
  projectId?: string;
}) {
  const properties = {
    code,
    reference_id: referenceId,
    pathname,
    team_id: teamId,
    project_id: projectId,
    ...safeErrorDetails(error),
    $groups: {
      ...(teamId ? { team: teamId } : {}),
      ...(projectId ? { project: projectId } : {}),
    },
    // Override automatic URL properties: OAuth/query parameters may be sensitive.
    $current_url: window.location.origin + pathname,
    $pathname: pathname,
    $referrer: "",
  };
  // Classified loader failures are already logged server-side. Only unexpected
  // rendering/navigation errors need an additional browser console diagnostic.
  if (code === "UNEXPECTED_ERROR") {
    console.error(
      JSON.stringify({ event: "dashboard_route_error_shown", ...properties }),
    );
  }
  try {
    // Resolve after mount so the existing provider can initialize; reporting must
    // never break the fallback UI or introduce a second analytics client.
    const { default: posthog } = await import("posthog-js");
    posthog.capture("dashboard_route_error_shown", properties);
  } catch {
    // Console diagnostics remain available when analytics is blocked/unavailable.
  }
}
