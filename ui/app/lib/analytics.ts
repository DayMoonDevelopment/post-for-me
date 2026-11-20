// Optional, opt-in PostHog analytics for the showcase site.
//
// With no VITE_POSTHOG_KEY set the whole thing is inert: the loader snippet is
// never rendered and capture() is a no-op, so the registry + showcase still run
// with zero configuration (see .env.example). PostHog project keys are public
// (write-only ingestion keys), so exposing the key to the client is expected.
//
// To remove analytics entirely: delete this file and its two call sites
// (app/root.tsx renders the snippet; the $component route fires one event).

// Accessed directly (not via a variable) so Vite inlines the literal value at
// build time — when VITE_POSTHOG_KEY is unset, posthogSnippet() folds to a
// constant `null` and the loader string is dropped from the client bundle.
const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";

type Props = Record<string, unknown>;

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Props) => void };
  }
}

// Fire a custom event. Safe to call anywhere on the client — no-ops on the
// server and when analytics is disabled.
export function capture(event: string, props?: Props) {
  if (typeof window === "undefined") return;
  window.posthog?.capture(event, props);
}

// The official PostHog web snippet, parameterized. Rendered once in <head> when
// a key is configured; it loads posthog-js and starts autocapture (pageviews +
// clicks). `capture_pageview: "history_change"` also counts client-side route
// changes, so navigating between components is tracked. Returns null — i.e. we
// render nothing — when no key is set.
export function posthogSnippet(): string | null {
  if (!KEY) return null;
  const loader = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);`;
  const init = `posthog.init(${JSON.stringify(KEY)},{api_host:${JSON.stringify(
    HOST,
  )},person_profiles:"identified_only",capture_pageview:"history_change"});`;
  return loader + init;
}
