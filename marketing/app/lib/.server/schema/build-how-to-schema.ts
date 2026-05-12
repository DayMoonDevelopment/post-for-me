/**
 * Build a Schema.org HowTo JSON-LD blob from the route data.
 * Add / adjust the field names below if your loader exposes them differently.
 */
export function buildHowToSchema(data: {
  /* core page info */
  siteUrl: string;
  slug: string;
  title: string;
  summary?: string;

  /* how-to specifics */
  howToSteps: {
    /** Visible heading for the step */
    title: string;
    /** Descriptive instructions */
    text: string;
    /** Optional image URL (≥ 1200 px wide for Google) */
    image?: string;
    /** Optional in-page anchor ID (defaults to step-n) */
    anchor?: string;
  }[];

  /** Plain-text tool list (e.g., ["PostForMe CLI", "Node.js"]) */
  howToTools?: string[];
  /** Materials / supplies (e.g., ["API key", "Social account"]) */
  howToSupplies?: string[];
  /** ISO 8601 duration, e.g. "PT15M" */
  howToTotalTime?: string;
  /** Fallback hero image (16 × 9) if steps lack images */
  howToImage?: string;
}) {
  const canonical = `${data.siteUrl}/resources/${data.slug}`;

  /* ---------- Steps ---------- */
  const stepsLd = data.howToSteps.map((s, idx) => {
    const anchor = s.anchor ?? `step-${idx + 1}`;
    return {
      "@type": "HowToStep",
      position: idx + 1,
      name: s.title,
      text: s.text,
      url: `${canonical}#${anchor}`,
      ...(s.image ? { image: s.image } : {}),
    };
  });

  /* ---------- Root object ---------- */
  const howToLd: Record<string, string | unknown[] | string[] | undefined> = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: data.title,
    description: data.summary ?? "",
    image:
      data.howToImage ??
      data.howToSteps.find((s) => s.image)?.image ??
      undefined,
    totalTime: data.howToTotalTime,
    tool: (data.howToTools ?? []).map((t) => ({
      "@type": "HowToTool",
      name: t,
    })),
    supply: (data.howToSupplies ?? []).map((s) => ({
      "@type": "HowToSupply",
      name: s,
    })),
    step: stepsLd,
  };

  /* ---------- Strip empty fields ---------- */
  Object.keys(howToLd).forEach(
    (k) =>
      (howToLd[k] === undefined || howToLd[k]?.length === 0) &&
      delete howToLd[k]
  );

  return howToLd;
}
