import { randomUUID } from "node:crypto";
import { data, type LoaderFunctionArgs } from "react-router";
import type { SupabaseContext } from "./supabase";
import {
  routeErrors,
  safeErrorDetails,
  type RouteErrorCode,
} from "~/lib/route-errors";

const requestIds = new WeakMap<Request, string>();

export function getRequestReference(request: Request) {
  let referenceId = requestIds.get(request);
  if (!referenceId) {
    referenceId = randomUUID();
    requestIds.set(request, referenceId);
  }
  return referenceId;
}

type DiagnosticArgs = Pick<LoaderFunctionArgs, "request" | "params">;

export async function observeRouteLoad<T>(
  args: DiagnosticArgs,
  route: string,
  handler: (diagnostics: RouteDiagnostics) => Promise<T>,
): Promise<T> {
  const diagnostics = new RouteDiagnostics(args, route);
  const onAbort = () => diagnostics.log("dashboard_route_aborted");
  args.request.signal.addEventListener("abort", onAbort, { once: true });
  diagnostics.log("dashboard_route_started");
  try {
    const result = await handler(diagnostics);
    diagnostics.log(
      args.request.signal.aborted
        ? "dashboard_route_aborted"
        : "dashboard_route_completed",
    );
    return result;
  } catch (error) {
    if (args.request.signal.aborted) throw error;
    // Classified errors and redirects have already been handled; do not convert them.
    if (
      error instanceof Response ||
      (error &&
        typeof error === "object" &&
        "type" in error &&
        error.type === "DataWithResponseInit")
    ) {
      throw error;
    }
    return diagnostics.fail("UNEXPECTED_ERROR", error);
  } finally {
    args.request.signal.removeEventListener("abort", onAbort);
  }
}

export class RouteDiagnostics {
  private startedAt = performance.now();
  private stage = "initialization";

  constructor(
    private args: DiagnosticArgs,
    private route: string,
  ) {}

  log(event: string, extra: Record<string, unknown> = {}) {
    const { request, params } = this.args;
    const record = JSON.stringify({
      event,
      reference_id: getRequestReference(request),
      route: this.route,
      pathname: new URL(request.url).pathname,
      method: request.method,
      team_id: params.teamId,
      project_id: params.projectId,
      stage: this.stage,
      duration_ms: Math.round(performance.now() - this.startedAt),
      aborted: request.signal.aborted,
      ...extra,
    });
    if (event === "dashboard_route_failed") console.error(record);
    else console.info(record);
  }

  async step<T>(
    stage: string,
    code: RouteErrorCode,
    operation: () => PromiseLike<T>,
  ): Promise<T> {
    this.stage = stage;
    this.log("dashboard_route_stage_started");
    const startedAt = performance.now();
    try {
      const result = await operation();
      this.log("dashboard_route_stage_completed", {
        stage_duration_ms: Math.round(performance.now() - startedAt),
      });
      return result;
    } catch (error) {
      if (this.args.request.signal.aborted) throw error;
      return this.fail(code, error);
    }
  }

  fail(code: RouteErrorCode, cause?: unknown): never {
    if (this.args.request.signal.aborted) {
      this.log("dashboard_route_aborted");
      throw (
        this.args.request.signal.reason ??
        new DOMException("Request aborted", "AbortError")
      );
    }
    const { status, message } = routeErrors[code];
    this.log("dashboard_route_failed", {
      code,
      status,
      message,
      ...safeErrorDetails(cause),
    });
    throw data(
      { code, referenceId: getRequestReference(this.args.request) },
      {
        status,
        headers: {
          "X-Dashboard-Error-Id": getRequestReference(this.args.request),
        },
      },
    );
  }
}

export async function requireRouteUser(
  diagnostics: RouteDiagnostics,
  supabase: SupabaseContext["supabase"],
) {
  const { data: auth, error } = await diagnostics.step(
    "auth_lookup",
    "AUTH_UNAVAILABLE",
    () => supabase.auth.getUser(),
  );
  if (error) {
    const expired =
      error.name === "AuthSessionMissingError" ||
      error.status === 401 ||
      error.code === "refresh_token_not_found" ||
      error.code === "refresh_token_already_used";
    diagnostics.fail(expired ? "SESSION_EXPIRED" : "AUTH_UNAVAILABLE", error);
  }
  if (!auth.user) diagnostics.fail("SESSION_EXPIRED");
  return auth.user;
}

export function reportServerError(error: unknown, request: Request) {
  console[request.signal.aborted ? "info" : "error"](
    JSON.stringify({
      event: request.signal.aborted
        ? "dashboard_request_aborted"
        : "dashboard_server_error",
      reference_id: getRequestReference(request),
      pathname: new URL(request.url).pathname,
      method: request.method,
      aborted: request.signal.aborted,
      ...safeErrorDetails(error),
    }),
  );
}
