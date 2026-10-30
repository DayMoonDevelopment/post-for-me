import { GoogleAdsTag } from "./google-ads-tag";
import { MetaPixel } from "./meta-pixel";

/**
 * Mounts the ad pixels (Meta + Google) in the document head. Each is rendered
 * only when its env id is set, so local/dev runs without ids are a no-op. The
 * pixels handle match-quality cookies + pageviews only; conversions flow through
 * PostHog destinations from the API webhook, not these tags.
 */
export function Pixels() {
  const metaPixelId = import.meta.env.VITE_META_PIXEL_ID;
  const googleAdsTagId = import.meta.env.VITE_GOOGLE_ADS_TAG_ID;

  return (
    <>
      {metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null}
      {googleAdsTagId ? <GoogleAdsTag tagId={googleAdsTagId} /> : null}
    </>
  );
}
