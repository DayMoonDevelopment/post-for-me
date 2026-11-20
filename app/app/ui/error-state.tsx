import { useTranslation } from "react-i18next";

import { WarningIcon } from "~/icons";
import { Button } from "~/ui/button";

/**
 * The shared error presentation for route error boundaries. Deliberately calm +
 * contained (icon + friendly title + one-line description + recovery actions) —
 * NOT a raw stack dump. `title`/`description` are always the user-safe copy; the
 * raw stack (dev only) is tucked into a collapsed `<details>` so it's available
 * without dominating the page. Uses `flex-1` so it fills whatever container it's
 * dropped into (full-screen at the root, or the content area inside the shell).
 *
 * Pair with `useErrorContent` (`~/hooks/use-error-content`) to derive the copy
 * from a route boundary error.
 */
export function ErrorState({
  title,
  description,
  stack,
}: {
  description: string;
  stack?: string;
  title: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-warning/10">
        <WarningIcon className="size-6 text-warning" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          {title}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("error.reload")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          {t("error.home")}
        </Button>
      </div>
      {stack ? (
        <details className="mt-1 w-full max-w-2xl text-start">
          <summary className="cursor-pointer select-none text-xs text-muted-foreground">
            {t("error.technicalDetails")}
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-start text-xs leading-relaxed">
            <code>{stack}</code>
          </pre>
        </details>
      ) : null}
    </div>
  );
}
