import { AppException, exceptionForKind, kindForStatus } from "~/lib/.server/errors";

import { API_URL } from "./constants";

/**
 * A minimal typed client for the Post For Me API, authenticated with a
 * request-scoped bearer key (a temporary key from {@link resolveTemporaryApiKey}
 * or, later, a user JWT). Deliberately a thin `fetch` wrapper rather than the
 * published SDK, which currently trails the API (no webhooks resource yet) — the
 * endpoint shapes are stable and mapped to our domain in each entity adapter.
 *
 * Non-2xx responses normalize to an {@link AppException} (status → kind), so the
 * error framework surfaces them like any other.
 */
export interface ApiClient {
  delete(path: string): Promise<void>;
  get<T>(path: string): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

async function toException(response: Response): Promise<AppException> {
  let detail: string | undefined;
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof body.error === "string") detail = body.error;
    else if (typeof body.message === "string") detail = body.message;
  } catch {
    // Non-JSON error body — the status alone still maps to a kind.
  }
  return exceptionForKind(kindForStatus(response.status), undefined, {
    message: `Post For Me API ${response.status}${detail ? `: ${detail}` : ""}`,
    status: response.status,
    context: { provider: "post-for-me-api", status: response.status },
  });
}

export function createApiClient(apiKey: string): ApiClient {
  async function send(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    return fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function json<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await send(method, path, body);
    if (!response.ok) throw await toException(response);
    return (await response.json()) as T;
  }

  return {
    get: (path) => json("GET", path),
    post: (path, body) => json("POST", path, body),
    patch: (path, body) => json("PATCH", path, body),
    async delete(path) {
      const response = await send("DELETE", path);
      if (!response.ok) throw await toException(response);
    },
  };
}
