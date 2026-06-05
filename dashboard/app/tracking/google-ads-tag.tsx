/**
 * Google Ads global site tag (gtag.js). Loaded server-side into `<head>` so it
 * fires on the initial document load — capturing `gclid` into the `_gcl_aw`
 * cookie on `.postforme.dev` (apex), which crosses to the dashboard naturally.
 *
 * No browser-side conversion firing — paid conversions are sourced server-side
 * via PostHog → Google Ads destination. This tag is for landing-page tracking,
 * cookie persistence, and retargeting/audience signals only.
 */
export function GoogleAdsTag({ tagId }: { tagId: string }) {
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(tagId)});`,
        }}
      />
    </>
  );
}
