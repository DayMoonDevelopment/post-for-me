"use client";

import type { ReactNode } from "react";

import { PlatformAvatar } from "~/components/platform-avatar";
import {
  useSocialPostConfiguration,
  type UseSocialPostConfigurationReturn,
} from "~/hooks/use-social-post-configuration";
import type { SocialAccount } from "~/lib/post-for-me.types";
import type { SocialPostConfigurationField } from "~/lib/social-post-configuration.schema";
import type { SocialPostConfiguration } from "~/lib/social-post-configuration.types";

import {
  CASCADE_ELEMENTS,
  CASCADE_HEIGHT,
  CASCADE_WIDTH,
  type CascadeTone,
} from "./cascade-figure-shapes";

const CASCADE_STROKE: Record<CascadeTone, string> = {
  gray: "stroke-zinc-400",
  blue: "stroke-blue-500",
  pink: "stroke-pink-500",
  ink: "stroke-foreground",
  muted: "stroke-muted-foreground",
};
const CASCADE_FILL: Record<CascadeTone, string> = {
  gray: "fill-zinc-400/10",
  blue: "fill-blue-500/10",
  pink: "fill-pink-500/10",
  ink: "fill-transparent",
  muted: "fill-muted-foreground/10",
};
const CASCADE_PILL: Record<CascadeTone, string> = {
  gray: "fill-zinc-400/15",
  blue: "fill-blue-500/15",
  pink: "fill-pink-500/15",
  ink: "fill-foreground/10",
  muted: "fill-muted-foreground/15",
};
const CASCADE_TEXT: Record<CascadeTone, string> = {
  gray: "fill-zinc-500",
  blue: "fill-blue-600 dark:fill-blue-400",
  pink: "fill-pink-600 dark:fill-pink-400",
  ink: "fill-foreground",
  muted: "fill-muted-foreground",
};
const FONT_WEIGHT = { normal: 400, medium: 500, semibold: 600, bold: 700 } as const;

/**
 * The hero figure: how a configuration cascades (account override ▸ platform config ▸
 * field default) into one effective value. Drawn hand-sketched with rough.js, entirely
 * in-code, so it themes and re-skins with the page instead of being a static image.
 */
export function SocialPostConfigurationCascadeFigure() {
  return (
    <svg
      viewBox={`0 0 ${CASCADE_WIDTH} ${CASCADE_HEIGHT}`}
      className="w-full max-w-3xl"
      role="img"
      aria-label="A configuration cascade: field defaults, platform config, and an account override resolving into one effective config, each value tagged by the layer it came from."
    >
      {CASCADE_ELEMENTS.map((el, i) => {
        if (el.kind === "path") {
          return el.role === "fill" ? (
            <path key={i} d={el.d} className={CASCADE_FILL[el.tone]} />
          ) : (
            <path
              key={i}
              d={el.d}
              fill="none"
              className={CASCADE_STROKE[el.tone]}
              strokeWidth={el.strokeWidth ?? 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        if (el.kind === "pill") {
          return (
            <rect
              key={i}
              x={el.x}
              y={el.y}
              width={el.w}
              height={el.h}
              rx={10}
              className={CASCADE_PILL[el.tone]}
            />
          );
        }
        return (
          <text
            key={i}
            x={el.x}
            y={el.y}
            textAnchor={el.anchor === "middle" ? "middle" : "start"}
            className={`${CASCADE_TEXT[el.tone]} ${el.mono ? "font-mono" : ""}`}
            style={{
              fontSize: el.size,
              fontWeight: FONT_WEIGHT[el.weight],
              letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
            }}
          >
            {el.text}
          </text>
        );
      })}
    </svg>
  );
}

/** Present a configured value the way a person reads it (labels, On/Off). */
function formatValue(field: SocialPostConfigurationField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (field.control === "segmented" || field.control === "select") {
    return field.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** A short preview of a media override — the first item's URL, protocol stripped. */
function mediaValue(media: unknown[]): string {
  const url = (media[0] as { url?: string } | undefined)?.url;
  const preview = url
    ? url.replace(/^https?:\/\//, "")
    : `${media.length} item${media.length === 1 ? "" : "s"}`;
  const clipped =
    preview.length > 30 ? `${preview.slice(0, 14)}…${preview.slice(-13)}` : preview;
  return media.length > 1 ? `${clipped}  +${media.length - 1}` : clipped;
}

/** A compact, read-only fact: label stacked tight over its value so the card stays narrow. */
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid">
      <span className="font-mono text-[11px] leading-tight text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium leading-tight break-words">{value}</span>
    </div>
  );
}

/**
 * The API-shaped value, shown in the context of a full social post: the post-level
 * fields (caption, media, social_accounts) are elided with `...` so the focus stays on
 * the configuration, which is serialized in full.
 */
function ValuePanel({ value }: { value: SocialPostConfiguration }) {
  const configJson = JSON.stringify(value, null, 2);
  const firstNl = configJson.indexOf("\n");
  const lastNl = configJson.lastIndexOf("\n");
  const inner =
    firstNl >= 0 && lastNl > firstNl ? configJson.slice(firstNl + 1, lastNl) : "";
  const lines = [
    '  "caption": "...",',
    '  "media": [...],',
    `  "social_accounts": [...]${inner ? "," : ""}`,
  ];
  if (inner) lines.push(inner);
  const json = `{\n${lines.join("\n")}\n}`;

  return (
    <div className="grid content-start">
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
        {json}
      </pre>
    </div>
  );
}

/**
 * A compact, read-only card for one platform: its avatar, and only the options that are
 * actually configured (rendered as key → value rows). `children` slots in extra content
 * such as per-account rows.
 */
function PlatformCard({
  config,
  value,
  platform,
  label,
  children,
}: {
  config: UseSocialPostConfigurationReturn;
  value: SocialPostConfiguration;
  platform: SocialAccount["platform"];
  label: string;
  children?: ReactNode;
}) {
  const raw = (value.platform_configurations?.[platform] ?? {}) as Record<
    string,
    unknown
  >;
  const fields = config
    .visibleFieldsForPlatform(platform)
    .filter((f) => f.key in raw && raw[f.key] != null && raw[f.key] !== "");
  const media = Array.isArray(raw.media) ? raw.media : null;

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2.5">
        <PlatformAvatar platform={platform} className="size-7" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {fields.length || media?.length ? (
        <div className="grid gap-3 border-t pt-3">
          {media?.length ? (
            <FieldRow label="media" value={mediaValue(media)} />
          ) : null}
          {fields.map((field) => (
            <FieldRow
              key={field.key}
              label={field.key}
              value={formatValue(field, raw[field.key])}
            />
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">No extra options</span>
      )}
      {children}
    </div>
  );
}

const IG_FB_ACCOUNTS: SocialAccount[] = [
  { id: "ig", platform: "instagram", username: "acme" },
  { id: "fb", platform: "facebook", username: "Acme Page" },
];
const IG_FB_VALUE: SocialPostConfiguration = {
  platform_configurations: {
    instagram: {
      placement: "reels",
      media: [{ url: "https://cdn.acme.dev/summer-reel.mp4" }],
    },
    facebook: { placement: "stories" },
  },
};

/**
 * Platform-specific options: Instagram and Facebook each set their own placement, and
 * Instagram additionally OVERRIDES the post media with its own Reel — the override
 * rides in the platform config as just another value.
 */
export function SocialPostConfigurationInstagramFacebook() {
  const config = useSocialPostConfiguration({
    accounts: IG_FB_ACCOUNTS,
    value: IG_FB_VALUE,
  });

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        {config.groups.map((group) => (
          <PlatformCard
            key={group.platform}
            config={config}
            value={IG_FB_VALUE}
            platform={group.platform}
            label={group.label}
          />
        ))}      </div>
      <ValuePanel value={IG_FB_VALUE} />
    </div>
  );
}

const YT_TT_ACCOUNTS: SocialAccount[] = [
  { id: "yt", platform: "youtube", username: "Acme" },
  { id: "tt", platform: "tiktok", username: "acme" },
];
const YT_TT_VALUE: SocialPostConfiguration = {
  platform_configurations: {
    youtube: { title: "Launch recap", privacy_status: "public", made_for_kids: false },
    tiktok: {
      privacy_status: "public",
      allow_comment: true,
      disclose_branded_content: true,
    },
  },
};

/**
 * Several platforms, one post: a single configuration carries YouTube and TikTok
 * settings side by side, each landing under its own key in platform_configurations.
 */
export function SocialPostConfigurationYoutubeTiktok() {
  const config = useSocialPostConfiguration({
    accounts: YT_TT_ACCOUNTS,
    value: YT_TT_VALUE,
  });

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        {config.groups.map((group) => (
          <PlatformCard
            key={group.platform}
            config={config}
            value={YT_TT_VALUE}
            platform={group.platform}
            label={group.label}
          />
        ))}      </div>
      <ValuePanel value={YT_TT_VALUE} />
    </div>
  );
}

const PINTEREST_ACCOUNTS: SocialAccount[] = [
  { id: "pin_brand", platform: "pinterest", username: "acme" },
  { id: "pin_shop", platform: "pinterest", username: "acme.shop" },
];
const PINTEREST_VALUE: SocialPostConfiguration = {
  platform_configurations: { pinterest: { link: "https://acme.shop/sale" } },
  account_configurations: [
    { social_account_id: "pin_brand", configuration: { board_ids: ["home-inspo"] } },
    { social_account_id: "pin_shop", configuration: { board_ids: ["new-arrivals"] } },
  ],
};

/**
 * Account configurations: Pinterest boards are account-specific — each account pins to
 * its OWN board — so a board can only be set per account, never shared at the platform
 * level. The shared link stays in platform_configurations; each board lands in
 * account_configurations.
 */
export function SocialPostConfigurationOverrides() {
  const config = useSocialPostConfiguration({
    accounts: PINTEREST_ACCOUNTS,
    value: PINTEREST_VALUE,
  });

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        <PlatformCard
          config={config}
          value={PINTEREST_VALUE}
          platform="pinterest"
          label="Pinterest"
        >
          <div className="grid gap-3 border-t pt-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Per-account boards
            </span>
            {config.accountsForPlatform("pinterest").map((account) => (
              <FieldRow
                key={account.id}
                label={`@${account.username}`}
                value={
                  (
                    config.getAccountValue(account.id, "board_ids") as
                      | string[]
                      | undefined
                  )?.join(", ") ?? "—"
                }
              />
            ))}
          </div>
        </PlatformCard>      </div>
      <ValuePanel value={PINTEREST_VALUE} />
    </div>
  );
}
