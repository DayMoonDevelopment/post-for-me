import { useEffect } from "react";

/**
 * Captures ad-attribution params from the landing URL into a first-party cookie
 * scoped to the apex domain so they survive the marketing → dashboard hop.
 * Read on the dashboard side both client-side (for PostHog `identify`) and
 * server-side (for Stripe `subscription_data.metadata` at checkout), where they
 * end up on the `customer_converted` event consumed by the PostHog → Meta/Google
 * destinations.
 *
 * Writes only when the URL actually carries a click ID or UTM param — a plain
 * pageview never clobbers an existing attribution cookie. Last-click wins among
 * click-bearing visits, matching standard ad-attribution behavior.
 */
const COOKIE_NAME = "pfm_attribution";
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days — matches Google's default click window
const FIELDS = [
  "gclid",
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export function AttributionCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const collected: Record<string, string> = {};
      for (const field of FIELDS) {
        const value = params.get(field);
        if (value) collected[field] = value;
      }
      if (Object.keys(collected).length === 0) return;

      collected.landing_url = window.location.href;
      collected.referrer = document.referrer || "";
      collected.captured_at = new Date().toISOString();

      const apexDomain = inferApexDomain(window.location.hostname);
      const secure = window.location.protocol === "https:";

      const parts = [
        `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(collected))}`,
        "path=/",
        `max-age=${COOKIE_MAX_AGE_SECONDS}`,
        "samesite=lax",
      ];
      if (apexDomain) parts.push(`domain=${apexDomain}`);
      if (secure) parts.push("secure");

      document.cookie = parts.join("; ");
    } catch {
      // best-effort; never throw
    }
  }, []);

  return null;
}

/**
 * Returns `.example.com` for `www.example.com` / `example.com`, so the cookie
 * is shared across all subdomains (marketing root + `app.` dashboard). Returns
 * null for `localhost` and bare IPs so the cookie just defaults to the current
 * host in dev.
 */
function inferApexDomain(hostname: string): string | null {
  if (!hostname || hostname === "localhost") return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  const parts = hostname.split(".");
  if (parts.length < 2) return null;
  return "." + parts.slice(-2).join(".");
}
