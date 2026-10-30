/**
 * Google Ads global site tag (gtag.js). Loads gtag + the base config only — no
 * conversion `gtag('event', 'conversion', …)` firing. Conversions are sent
 * server-side via PostHog's Google Ads destination from the API webhook, deduped
 * by a stable order/transaction id.
 */
export function GoogleAdsTag({ tagId }: { tagId: string }) {
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tagId}');`,
        }}
      />
    </>
  );
}
