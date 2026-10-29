// Vendored in trigger/ and api/src/logging.
// Keep these copies in sync; siblings do not share runtime imports.
const REDACTED = "[REDACTED]";
const secretKey =
  /^(?:accessToken|refreshToken|idToken|accessJwt|refreshJwt|token|oauthToken|oauthTokenSecret|authorization|proxyAuthorization|cookie|setCookie|clientSecret|appSecret|apiKey|password)$/i;

function isSecretKey(key: string): boolean {
  return secretKey.test(key.replace(/[-_]/g, ""));
}

/** Produces a JSON-safe diagnostic copy, never modifying request credentials. */
export function redactSecrets<T>(value: T, knownSecrets: string[] = []): T {
  const secrets = new Set(knownSecrets.filter(Boolean));
  const visited = new WeakSet<object>();
  const collect = (input: unknown, depth = 0): void => {
    if (!input || typeof input !== "object" || depth > 20 || visited.has(input))
      return;
    visited.add(input);
    for (const [key, item] of Object.entries(input)) {
      if (isSecretKey(key) && typeof item === "string" && item)
        secrets.add(item);
      else collect(item, depth + 1);
    }
  };
  collect(value);
  const sortedSecrets = [...secrets].sort((a, b) => b.length - a.length);
  const redactText = (text: string): string => {
    for (const secret of sortedSecrets) {
      text = text.split(secret).join(REDACTED);
      text = text.split(encodeURIComponent(secret)).join(REDACTED);
    }
    return text
      .replace(/\b(Bearer|Basic)\s+[^\s,;"'\\]+/gi, "$1 [REDACTED]")
      .replace(
        /(\b(?:access[_-]?token|refresh[_-]?token|id[_-]?token|accessJwt|refreshJwt|oauth[_-]?token(?:[_-]?secret)?|client[_-]?secret|app[_-]?secret|api[_-]?key|password)["']?\s*[:=]\s*["']?)[^\s&"'<>\\,;}]+/gi,
        "$1[REDACTED]",
      );
  };
  const ancestors = new WeakSet<object>();
  const copy = (input: unknown, depth = 0): unknown => {
    if (typeof input === "string") return redactText(input);
    if (!input || typeof input !== "object")
      return typeof input === "function" ? undefined : input;
    if (depth > 20) return "[Omitted]";
    if (ancestors.has(input)) return "[Circular]";
    if (input instanceof Date) return input.toISOString();
    if (input instanceof URL || input instanceof URLSearchParams)
      return redactText(input.toString());
    if (ArrayBuffer.isView(input) || input instanceof ArrayBuffer)
      return "[Omitted binary data]";
    ancestors.add(input);
    let result: unknown;
    if (Array.isArray(input)) {
      result = input.map((item) => copy(item, depth + 1));
    } else {
      const entries =
        input instanceof Headers ? [...input.entries()] : Object.entries(input);
      const fields: Record<string, unknown> = {};
      if (input instanceof Error) {
        fields.name = redactText(input.name);
        fields.message = redactText(input.message);
        fields.stack = input.stack ? redactText(input.stack) : undefined;
        fields.cause = copy(input.cause, depth + 1);
      }
      for (const [key, item] of entries) {
        // Transport objects can contain sockets and unstructured credential bytes.
        fields[key] = isSecretKey(key)
          ? REDACTED
          : key === "request"
            ? "[Omitted transport request]"
            : copy(item, depth + 1);
      }
      result = fields;
    }
    ancestors.delete(input);
    return result;
  };
  return copy(value) as T;
}
