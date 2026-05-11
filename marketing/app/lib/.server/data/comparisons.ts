import { ayrshare } from "./comparisons.ayrshare";
import { buffer } from "./comparisons.buffer";
import { hootsuite } from "./comparisons.hootsuite";
import { late } from "./comparisons.late";
import { outstand } from "./comparisons.outstand";
import { postplanify } from "./comparisons.postplanify";
import { uploadPost } from "./comparisons.upload-post";
import { zernio } from "./comparisons.zernio";

export interface PricingComparisonRow {
  label: string;
  pfm: string;
  competitor: string;
}

export interface CompetitorComparisonData {
  competitor: {
    name: string; // e.g., "Buffer" or "Upload-Post"
    slug: string; // e.g., "buffer"
    productType: "SaaS Dashboard" | "API Infrastructure" | "Automation Tool";
    pricingModel: "Per-Seat" | "Per-Profile" | "Tiered" | "Hybrid";
    websiteUrl: string; // External Link
    // Optional: surfaced as a banner when a competitor has rebranded.
    rebrandedAs?: {
      name: string; // New brand name, e.g., "Zernio"
      slug: string; // New comparison slug, e.g., "zernio"
    };
  };
  pricing: {
    rows: PricingComparisonRow[];
  };
  // Optional "you might use" section - set to null to hide this section for a competitor
  youMightUse?: {
    competitorScenarios: string[]; // When the competitor is the right choice
  } | null;
  // Optional proposition for displaying a single value proposition
  proposition?: {
    title: string; // Alert title
    description: string; // Alert description
  } | null;
  features: {
    sdks: {
      name: string;
      pfmAvailable: boolean;
      competitorAvailable: boolean;
    }[];
  };
}

export const comparisons: Record<string, CompetitorComparisonData> = {
  buffer: buffer,
  hootsuite: hootsuite,
  ayrshare: ayrshare,
  late: late,
  zernio: zernio,
  "upload-post": uploadPost,
  outstand: outstand,
  postplanify: postplanify,
};
