import type { TFunction } from "i18next";
import type { ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { JsonBlock } from "~/ui/json-block";

import type { LogKind, LogSide } from "./result-logs-parse";

/**
 * Friendly interpreters keyed by raw operation name. Each returns a curated view,
 * or is absent to fall back to {@link JsonBlock}. Empty for now — pretty JSON is
 * the default; per-shape views get added after an audit of expected payloads.
 */
const INTERPRETERS: Record<
  string,
  (payload: unknown, t: TFunction) => ReactNode
> = {};

/** One side (request or response) of an operation: a labelled block rendering a
 * friendly view when one matches, else the raw payload as JSON. */
export function LogSideBlock({ side, data }: { data: LogSide; side: LogKind; }) {
  const { t } = useTranslation();
  const friendly = INTERPRETERS[data.rawName]?.(data.payload, t);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {t(`socialPostResults.kind.${side}`)}
      </span>
      {friendly ?? <JsonBlock value={data.payload} />}
    </div>
  );
}
