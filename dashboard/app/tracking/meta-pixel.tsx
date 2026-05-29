/**
 * Meta Pixel (fbq) base load. Initializes and fires a single `PageView` on the
 * initial document load. By default `fbq` writes its `_fbc` (fbclid-derived)
 * and `_fbp` cookies to the apex domain, so they cross to the dashboard for the
 * server-side conversion path.
 *
 * No browser-side `Subscribe` / `CompleteRegistration` firing — those are
 * sourced server-side via PostHog → Meta Ads destination. This is for
 * landing-page tracking, cookie persistence, and audience modeling only.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixelId)});fbq('track','PageView');`,
        }}
      />
      <noscript>
        <img
          alt=""
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
