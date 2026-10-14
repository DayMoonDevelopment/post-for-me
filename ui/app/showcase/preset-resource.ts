import type { Route } from "./+types/preset-resource";

import {
  buildParamsUrl,
  presetCode,
  resolvePreset,
  shuffleUrl,
} from "./resolve-preset.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const sp = url.searchParams;
  const raw = sp.get("code")?.trim();

  // Three modes: explicit axis params (control panel), `?shuffle=1` (random
  // valid preset), or a pasted preset `code`. Params/code are deterministic by
  // URL and can be cached; shuffle must stay fresh per request.
  const hasParams = sp.has("style") || sp.has("baseColor") || sp.has("radius");
  const target = hasParams
    ? buildParamsUrl(Object.fromEntries(sp))
    : sp.has("shuffle")
      ? shuffleUrl()
      : raw
        ? presetCode(raw)
        : null;

  if (!target) {
    return Response.json({ error: "Enter a preset code." }, { status: 400 });
  }

  const result = await resolvePreset(target);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const cacheable = hasParams || (!sp.has("shuffle") && raw);
  return Response.json(result, {
    headers: {
      "Cache-Control": cacheable
        ? "public, max-age=3600, s-maxage=86400"
        : "no-store",
    },
  });
}
