import { GoogleAdsTag } from "./google-ads-tag";
import { MetaPixel } from "./meta-pixel";

/**
 * One-line mount point for the browser ad pixels. Drop into the root layout's
 * `<head>`; each pixel is gated on its env-driven id being present, so an
 * unconfigured install renders nothing.
 */
export function Pixels({
  googleAdsTagId,
  metaPixelId,
}: {
  googleAdsTagId: string | undefined;
  metaPixelId: string | undefined;
}) {
  return (
    <>
      {googleAdsTagId ? <GoogleAdsTag tagId={googleAdsTagId} /> : null}
      {metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null}
    </>
  );
}
