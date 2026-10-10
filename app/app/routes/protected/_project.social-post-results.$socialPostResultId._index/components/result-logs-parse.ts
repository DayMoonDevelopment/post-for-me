export type LogKind = "request" | "response";

/** One side of an operation — its raw operation name (the single-key wrapper,
 * e.g. `createMediaResponse`, used to look up a friendly interpreter) + payload. */
export interface LogSide {
  payload: unknown;
  rawName: string;
}

/** An operation: the two sides of one story, paired by index. */
export interface LogOperation {
  /** Humanized operation name, e.g. "Create media". */
  name: string;
  request?: LogSide;
  response?: LogSide;
}

/** jsonb usually arrives parsed; reparse a (double-encoded) JSON string. */
export function parseDetails(details: unknown): unknown {
  if (typeof details !== "string") return details;
  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Unwrap one `{ "<operation>": <payload> }` entry into a {@link LogSide}. */
function toSide(raw: unknown): LogSide | undefined {
  if (raw == null) return undefined;
  const obj = asRecord(raw);
  const keys = obj ? Object.keys(obj) : [];
  if (obj && keys.length === 1) return { rawName: keys[0], payload: obj[keys[0]] };
  return { rawName: "", payload: raw };
}

/** "createMediaResponse" → "Create media" (drop the kind suffix, space camelCase). */
function humanizeOperation(rawName: string): string {
  const base = rawName.replace(/(request|response)$/i, "").trim();
  if (!base) return "Operation";
  const spaced = base
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * Pair `details.requests` / `details.responses` by index into ordered operations
 * (oldest first) — request and response are two sides of one story. Returns null
 * when the details aren't the request/response shape (caller shows raw instead).
 */
export function toOperations(details: unknown): LogOperation[] | null {
  const root = asRecord(details);
  if (!root) return null;
  const requests = Array.isArray(root.requests) ? root.requests : [];
  const responses = Array.isArray(root.responses) ? root.responses : [];
  if (requests.length === 0 && responses.length === 0) return null;

  const operations: LogOperation[] = [];
  const max = Math.max(requests.length, responses.length);
  for (let i = 0; i < max; i++) {
    const request = toSide(requests[i]);
    const response = toSide(responses[i]);
    if (!request && !response) continue;
    operations.push({
      name: humanizeOperation(request?.rawName || response?.rawName || ""),
      request,
      response,
    });
  }
  return operations.length ? operations : null;
}
