/**
 * Geometry for the "configuration cascade" figure, drawn with rough.js so it reads
 * hand-sketched. Only caption + media are global (post-level) and overridable below;
 * every other option is platform-specific (like a CSS `.class`) or account-specific
 * (like an `#id`). Each targeted account resolves its OWN config, the most specific
 * value winning per field. Fields/values mirror the API's post-configurations DTO
 * (Instagram: placement, share_to_feed; TikTok: privacy_status, allow_comment).
 *
 * Framework-free and deterministic: every shape is seeded, so paths are identical on
 * the server and client (no hydration drift) and reproducible by a preview script. The
 * React figure maps `tone` to theme-aware classes; a raster preview maps `tone` to
 * concrete colors — same elements, one source of truth.
 */

import rough from "roughjs";

const gen = rough.generator();

export const CASCADE_WIDTH = 1010;
export const CASCADE_HEIGHT = 550;

export type CascadeTone = "gray" | "blue" | "pink" | "ink" | "muted";

export type CascadeElement =
  | { kind: "path"; d: string; role: "stroke" | "fill"; tone: CascadeTone; strokeWidth?: number }
  | { kind: "pill"; x: number; y: number; w: number; h: number; tone: CascadeTone }
  | {
      kind: "text";
      x: number;
      y: number;
      text: string;
      tone: CascadeTone;
      size: number;
      weight: "normal" | "medium" | "semibold" | "bold";
      mono?: boolean;
      anchor?: "start" | "middle";
      letterSpacing?: number;
    };

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} ` +
    `v${h - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - 2 * r)} ` +
    `a${r},${r} 0 0 1 ${-r},${-r} v${-(h - 2 * r)} a${r},${r} 0 0 1 ${r},${-r} z`
  );
}

function pushBox(els: CascadeElement[], x: number, y: number, w: number, h: number, tone: CascadeTone, filled: boolean, seed: number) {
  const drawable = gen.path(roundedRectPath(x, y, w, h, 14), {
    roughness: 1,
    bowing: 1,
    seed,
    stroke: "#000",
    strokeWidth: 1.5,
    fill: filled ? "#000" : undefined,
    fillStyle: "solid",
  });
  for (const set of drawable.sets) {
    if (set.type === "fillPath") els.push({ kind: "path", d: gen.opsToPath(set), role: "fill", tone });
    else if (set.type === "path") els.push({ kind: "path", d: gen.opsToPath(set), role: "stroke", tone, strokeWidth: 1.6 });
  }
}

// A downward arrow. The head barbs open back toward the source (small half-angle),
// so a top-to-bottom shaft reads as pointing DOWN.
function pushArrow(els: CascadeElement[], x1: number, y1: number, x2: number, y2: number, seed: number) {
  const shaft = gen.line(x1, y1, x2, y2, { roughness: 1, bowing: 1, seed, strokeWidth: 1.4 });
  for (const set of shaft.sets) els.push({ kind: "path", d: gen.opsToPath(set), role: "stroke", tone: "muted", strokeWidth: 1.4 });
  const angle = Math.atan2(y2 - y1, x2 - x1);
  for (const spread of [angle - 0.42, angle + 0.42]) {
    const hx = x2 - 12 * Math.cos(spread);
    const hy = y2 - 12 * Math.sin(spread);
    const head = gen.line(x2, y2, hx, hy, { roughness: 0.6, seed: seed + 7, strokeWidth: 1.4 });
    for (const set of head.sets) els.push({ kind: "path", d: gen.opsToPath(set), role: "stroke", tone: "muted", strokeWidth: 1.4 });
  }
}

function pushKV(els: CascadeElement[], x: number, y: number, k: string, v: string, valTone: CascadeTone = "ink") {
  els.push({ kind: "text", x, y, text: k, tone: "muted", size: 13, weight: "medium", mono: true });
  els.push({ kind: "text", x: x + k.length * 7.6 + 12, y, text: v, tone: valTone, size: 13, weight: "semibold", mono: true });
}

function build(): CascadeElement[] {
  const els: CascadeElement[] = [];
  const cols = [40, 360, 680]; // left x of each account column
  const colW = 290;
  const center = (i: number) => cols[i] + colW / 2;

  // GLOBAL — the post's own caption + media, the only globally-set (overridable) fields.
  const gY = 14, gH = 76;
  pushBox(els, 40, gY, 930, gH, "gray", true, 11);
  els.push({ kind: "text", x: 58, y: gY + 28, text: "GLOBAL", tone: "gray", size: 14, weight: "bold", letterSpacing: 0.6 });
  pushKV(els, 58, gY + 56, "caption", "\"Summer sale\"");
  pushKV(els, 470, gY + 56, "media", "2 items");

  // PLATFORM overrides — one class per platform, real per-platform fields.
  const pY = 124, pH = 104;
  pushBox(els, 40, pY, colW, pH, "blue", true, 21);
  els.push({ kind: "text", x: 58, y: pY + 28, text: ".instagram", tone: "blue", size: 14, weight: "bold", mono: true });
  els.push({ kind: "text", x: 58, y: pY + 46, text: "All Instagram accounts", tone: "muted", size: 11, weight: "medium" });
  pushKV(els, 58, pY + 72, "placement", "reels");
  pushKV(els, 58, pY + 96, "share_to_feed", "true");

  pushBox(els, 360, pY, 610, pH, "blue", true, 22);
  els.push({ kind: "text", x: 378, y: pY + 28, text: ".tiktok", tone: "blue", size: 14, weight: "bold", mono: true });
  els.push({ kind: "text", x: 378, y: pY + 46, text: "All TikTok accounts", tone: "muted", size: 11, weight: "medium" });
  pushKV(els, 378, pY + 72, "privacy_status", "public");
  pushKV(els, 378, pY + 96, "allow_comment", "true");

  // ACCOUNT override — one id overrides the platform value for a single account.
  const aY = 264, aH = 82;
  pushBox(els, 680, aY, colW, aH, "pink", true, 33);
  els.push({ kind: "text", x: 698, y: aY + 28, text: "#tiktok_02", tone: "pink", size: 14, weight: "bold", mono: true });
  els.push({ kind: "text", x: 698, y: aY + 46, text: "one account", tone: "muted", size: 11, weight: "medium" });
  pushKV(els, 698, aY + 70, "privacy_status", "private", "pink");

  // Arrows: global feeds each platform box; each column flows down to its result.
  pushArrow(els, center(0), gY + gH + 2, center(0), pY - 4, 40);
  pushArrow(els, 665, gY + gH + 2, 665, pY - 4, 41);
  pushArrow(els, center(0), pY + pH + 2, center(0), 382,42);
  pushArrow(els, center(1), pY + pH + 2, center(1), 382,43);
  pushArrow(els, center(2), pY + pH + 2, center(2), aY - 4, 44);
  pushArrow(els, center(2), aY + aH + 2, center(2), 382,45);

  // RESOLVED — each account computes its own config; tags show which layer won.
  const rY = 386, rH = 150;
  const accounts: { name: string; rows: [string, string, string, CascadeTone][] }[] = [
    { name: "instagram_01", rows: [["caption", "", "global", "gray"], ["placement", "reels", "platform", "blue"], ["share_to_feed", "true", "platform", "blue"]] },
    { name: "tiktok_01", rows: [["caption", "", "global", "gray"], ["privacy_status", "public", "platform", "blue"], ["allow_comment", "true", "platform", "blue"]] },
    { name: "tiktok_02", rows: [["caption", "", "global", "gray"], ["allow_comment", "true", "platform", "blue"], ["privacy_status", "private", "account", "pink"]] },
  ];
  accounts.forEach((acc, i) => {
    const x = cols[i];
    const right = x + colW;
    pushBox(els, x, rY, colW, rH, "ink", false, 55 + i);
    els.push({ kind: "text", x: x + 18, y: rY + 30, text: acc.name, tone: "ink", size: 15, weight: "bold", mono: true });
    let ry = rY + 58;
    for (const [k, v, tag, tone] of acc.rows) {
      els.push({ kind: "text", x: x + 18, y: ry, text: k, tone: "muted", size: 12, weight: "medium", mono: true });
      if (v) els.push({ kind: "text", x: x + 128, y: ry, text: v, tone: tone === "pink" ? "pink" : "ink", size: 12, weight: "semibold", mono: true });
      const pillW = tag.length * 6.4 + 20;
      els.push({ kind: "pill", x: right - 14 - pillW, y: ry - 13, w: pillW, h: 20, tone });
      els.push({ kind: "text", x: right - 14 - pillW / 2, y: ry, text: tag, tone, size: 10.5, weight: "bold", anchor: "middle" });
      ry += 27;
    }
  });

  return els;
}

export const CASCADE_ELEMENTS: CascadeElement[] = build();
