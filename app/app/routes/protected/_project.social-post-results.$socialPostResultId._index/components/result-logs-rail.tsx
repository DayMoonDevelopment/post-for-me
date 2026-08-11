import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ExchangeIcon } from "~/icons";
import { Button } from "~/ui/button";
import {
  Timeline,
  TimelineContent,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "~/ui/timeline";

import type { LogOperation } from "./result-logs-parse";

import { LogSideBlock } from "./result-logs-side-block";

/**
 * How many operations to show before collapsing behind a "Show more". The whole
 * set is already in memory — `toOperations` parses one jsonb field client-side —
 * so this is pure client truncation (no network), unlike the server-paged
 * timelines the primitive also feeds. Keeps a long provider exchange from
 * rendering unbounded.
 */
const DEFAULT_VISIBLE = 5;

/**
 * The operations as a vertical rail: an exchange-glyph node per operation,
 * connected oldest → newest, each holding its request + response. Built on the
 * shared {@link Timeline} primitive — it owns the rail geometry (indicator gutter,
 * connector, drop-on-last), so nothing here hand-rolls a line or an "is last?"
 * check. There is no status: `value={0}` means no node is "active", and the
 * indicator is filled uniformly (an exchange glyph, not a progress state).
 */
export function LogRail({ operations }: { operations: LogOperation[] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const collapsed = !expanded && operations.length > DEFAULT_VISIBLE;
  const visible = collapsed ? operations.slice(0, DEFAULT_VISIBLE) : operations;
  const hiddenCount = operations.length - visible.length;

  return (
    <div className="flex flex-col gap-4">
      <Timeline value={0}>
        {visible.map((op, index) => (
          <TimelineItem key={`${op.name}-${index}`} step={index + 1}>
            <TimelineIndicator className="flex items-center justify-center border-0 bg-primary text-primary-foreground [&_svg]:size-4">
              <ExchangeIcon />
            </TimelineIndicator>
            <TimelineSeparator />
            <TimelineTitle className="font-heading text-sm font-semibold text-foreground">
              {op.name}
            </TimelineTitle>
            <TimelineContent className="mt-3 flex min-w-0 flex-col gap-3">
              {op.request ? (
                <LogSideBlock side="request" data={op.request} />
              ) : null}
              {op.response ? (
                <LogSideBlock side="response" data={op.response} />
              ) : null}
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
      {hiddenCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setExpanded(true)}
        >
          {t("socialPostResults.logsShowMore", { count: hiddenCount })}
        </Button>
      ) : null}
    </div>
  );
}
