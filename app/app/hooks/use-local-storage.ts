import * as React from "react";

/**
 * Persist a small string preference in `localStorage`, SSR-safe.
 *
 * The server render and the first client render both return `initialValue`, so
 * there's no hydration mismatch; once mounted, the stored value — if present and
 * accepted by the optional `isValid` type guard — replaces it. Writes are
 * best-effort: unavailable or full storage (privacy mode, quota) is swallowed
 * and the value still updates for the session.
 *
 * Scoped to string unions (the common "remember the user's choice" case). Pass a
 * type guard so a stale or hand-edited stored value can't widen the type.
 */
export function useLocalStorage<T extends string>(
  key: string,
  initialValue: T,
  isValid?: (value: string) => value is T,
): readonly [T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(initialValue);

  // Ref so an inline `isValid` doesn't re-run the read effect every render.
  const isValidRef = React.useRef(isValid);
  isValidRef.current = isValid;

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      const guard = isValidRef.current;
      if (stored !== null && (!guard || guard(stored))) {
        setValue(stored as T);
      }
    } catch {
      // Reading can throw when storage is unavailable; keep the default.
    }
  }, [key]);

  const set = React.useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Best-effort persistence; ignore write failures.
      }
    },
    [key],
  );

  return [value, set] as const;
}
