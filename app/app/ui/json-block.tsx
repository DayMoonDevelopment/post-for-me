import { type ReactNode, useState } from "react";

import { ChevronRightIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Copyable } from "~/ui/copyable";

const PUNCT = "text-muted-foreground";

/** A scalar leaf, token-colored. Strings go through JSON.stringify for correct
 * quoting/escaping — and React renders it as text, so there's no raw HTML. */
function Scalar({ value }: { value: unknown }) {
  if (value === null) return <span className="text-json-null">null</span>;
  switch (typeof value) {
    case "string":
      return <span className="break-all text-json-string">{JSON.stringify(value)}</span>;
    case "number":
      return <span className="text-json-number">{String(value)}</span>;
    case "boolean":
      return <span className="text-json-boolean">{String(value)}</span>;
    default:
      return <span className="break-all">{String(value)}</span>;
  }
}

/** The `"key":` prefix on an object entry (omitted for array items). */
function KeyPrefix({ name }: { name: string | undefined }) {
  if (name === undefined) return null;
  return (
    <>
      <span className="text-json-key">{JSON.stringify(name)}</span>
      <span className={PUNCT}>: </span>
    </>
  );
}

/** A non-interactive line: a caret-width spacer keeps it aligned under toggles. */
function Line({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start">
      <span className="size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Node({
  name,
  value,
  comma,
}: {
  comma: boolean;
  name?: string;
  value: unknown;
}) {
  const isContainer = value !== null && typeof value === "object";
  if (!isContainer) {
    return (
      <Line>
        <KeyPrefix name={name} />
        <Scalar value={value} />
        {comma ? <span className={PUNCT}>,</span> : null}
      </Line>
    );
  }
  return <ContainerNode name={name} value={value} comma={comma} />;
}

/** A collapsible object/array node. The header line is one toggle button (caret +
 * key + opening brace); expanded, children indent one level and the closing brace
 * sits on its own line. */
function ContainerNode({
  name,
  value,
  comma,
}: {
  comma: boolean;
  name?: string;
  value: object;
}) {
  const [open, setOpen] = useState(true);
  const isArray = Array.isArray(value);
  const entries: Array<[string | undefined, unknown]> = isArray
    ? (value as unknown[]).map((v) => [undefined, v])
    : Object.entries(value as Record<string, unknown>);
  const openBr = isArray ? "[" : "{";
  const closeBr = isArray ? "]" : "}";

  if (entries.length === 0) {
    return (
      <Line>
        <KeyPrefix name={name} />
        <span className={PUNCT}>
          {openBr}
          {closeBr}
        </span>
        {comma ? <span className={PUNCT}>,</span> : null}
      </Line>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start rounded text-start hover:bg-muted/60"
      >
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
          <ChevronRightIcon
            className={cn("size-3 transition-transform", open && "rotate-90")}
          />
        </span>
        <span className="min-w-0 flex-1">
          <KeyPrefix name={name} />
          <span className={PUNCT}>{openBr}</span>
          {!open ? (
            <span className={PUNCT}>
              {" … "}
              {closeBr}
              {comma ? "," : ""}
            </span>
          ) : null}
        </span>
      </button>
      {open ? (
        <>
          <div className="ps-4">
            {entries.map(([key, v], index) => (
              <Node
                key={isArray ? index : key}
                name={key}
                value={v}
                comma={index < entries.length - 1}
              />
            ))}
          </div>
          <Line>
            <span className={PUNCT}>{closeBr}</span>
            {comma ? <span className={PUNCT}>,</span> : null}
          </Line>
        </>
      ) : null}
    </>
  );
}

/**
 * JsonBlock — a small, read-only JSON viewer: token-highlighted (keys, strings,
 * numbers, booleans, null), with collapsible objects/arrays and whole-block
 * copy-to-clipboard via {@link Copyable}. JSON only and minimally interactive by
 * design; for source code or large/interactive trees reach for a heavier engine.
 *
 * Highlight hues come from the dedicated `--json-*` colorspace (`text-json-key`,
 * `text-json-string`, …) — an independent token set so JSON colors don't track
 * the brand accent. The surface (muted) and punctuation reuse existing tokens.
 */
export function JsonBlock({
  value,
  className,
  copyLabel = "Copy JSON",
}: {
  className?: string;
  copyLabel?: string;
  value: unknown;
}) {
  return (
    <div
      data-slot="json-block"
      className={cn(
        "relative overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground",
        className,
      )}
    >
      <Copyable
        value={JSON.stringify(value, null, 2) ?? "null"}
        label={copyLabel}
        icon="start"
        className="absolute end-2 top-2 z-10 rounded-md bg-muted/80 p-1 backdrop-blur-sm"
      />
      <div className="pe-8">
        <Node value={value} comma={false} />
      </div>
    </div>
  );
}
