import { useEffect, useRef, useState } from "react";
import { I18nextProvider } from "react-i18next";
import {
  data,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";

import { GlobalPendingBar } from "~/components/global-pending-bar";
import { useErrorContent } from "~/hooks/use-error-content";
import { useSystemPrefersDark } from "~/hooks/use-system-prefers-dark";
import { clearedFlashCookie, readFlash } from "~/lib/.server/flash";
import { createServices, servicesContext } from "~/lib/.server/services";
import {
  applySupabaseCookies,
  createSupabaseServerClient,
  supabaseContext,
} from "~/lib/.server/supabase";
import { fallbackLng, isSupportedLocale } from "~/lib/i18n/config";
import { browserI18n, createI18nInstance } from "~/lib/i18n/i18n";
import { detectLocale } from "~/lib/i18n/locale.server";
import { resolveThemeClass, THEME_SYSTEM_SCRIPT } from "~/lib/theme/config";
import { detectTheme } from "~/lib/theme/theme.server";
import { Pixels } from "~/tracking/pixels";
import { PostHogProvider } from "~/tracking/posthog-provider";
import { ErrorState } from "~/ui/error-state";
import { toast, Toaster } from "~/ui/sonner";
import { TooltipProvider } from "~/ui/tooltip";

import type { Route } from "./+types/root";

import "./app.css";

/**
 * Baseline security headers, applied to every response.
 *
 * They have to be set HERE: production serves the app from a Node container
 * behind Unkey Deploy, which passes response headers through untouched (a live
 * response carries only its own `x-unkey-*` tracing), and the repo's `Caddyfile`
 * is local-development only. Nothing upstream will add these.
 *
 * A FULL CSP is deliberately not here yet — `frame-ancestors` is the only
 * directive this sets. The rest needs real inventory work first: `img-src` has
 * to cover a runtime-dynamic Supabase storage host AND every provider CDN (when
 * photo mirroring is skipped the account intentionally keeps the provider's own
 * URL — see `getPublicProfilePhotoUrl`), and `script-src` spans three analytics
 * vendors including two inline tags. Guessing at those, even report-only,
 * produces violation noise that hides the real signal. Track it as its own task
 * and derive the policy from observed traffic.
 */
const SECURITY_HEADERS: Record<string, string> = {
  // No MIME sniffing — matters most for the tenant-uploaded bytes served by the
  // public verification-file route.
  "X-Content-Type-Options": "nosniff",
  // Don't leak authenticated paths (project/team/account ids live in the URL)
  // to third parties on outbound navigation.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // The dashboard is never framed. `frame-ancestors` supersedes
  // X-Frame-Options, and unlike script-src it can't break a third-party tag.
  "Content-Security-Policy": "frame-ancestors 'none'",
  // 2 years, subdomains included. Safe to assert: every environment that serves
  // this app is HTTPS-only (production terminates TLS upstream, local dev runs
  // behind Caddy's local CA on an HSTS-preloaded TLD).
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

/** Set the baseline headers without clobbering anything a route set itself. */
function applySecurityHeaders(to: Headers): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!to.has(name)) to.set(name, value);
  }
}

// Publishes a per-request Supabase client into context for every downstream
// route, then flushes any auth cookies it queued (refreshed tokens, sign-in,
// sign-out) onto the outgoing response — including thrown redirects, so a
// failed refresh still clears the stale cookie on the way to /login. Baseline
// security headers ride the same seam, for the same reason: it's the one place
// every response (returned or thrown) passes through.
export const middleware: Route.MiddlewareFunction[] = [
  async ({ request, context }, next) => {
    const headers = new Headers();
    const supabase = createSupabaseServerClient(request, headers);
    context.set(supabaseContext, supabase);
    // The per-request service registry rides on the same client. Lazy, so
    // publishing it for every request (guest routes included) costs nothing
    // until a loader actually reaches for a service.
    context.set(servicesContext, createServices(supabase));

    try {
      const response = await next();
      applySupabaseCookies(headers, response.headers);
      applySecurityHeaders(response.headers);
      return response;
    } catch (thrown) {
      if (thrown instanceof Response) {
        applySupabaseCookies(headers, thrown.headers);
        applySecurityHeaders(thrown.headers);
      }
      throw thrown;
    }
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const [locale, theme, flash] = await Promise.all([
    // The locale resolved for this request. `Layout` reads it (via
    // `useRouteLoaderData`) to build the i18next instance and set `<html lang>`.
    detectLocale(request),
    // The theme preference resolved for this request. `Layout` reads it to set
    // `<html class>` (or defer to the blocking inline script for "system").
    detectTheme(request),
    // Any error/success flashed by a redirect — toasted globally by `App`.
    readFlash(request),
  ]);

  if (flash) {
    // Hand the flash to the client AND expire the cookie so it fires once.
    return data(
      { locale, theme, flash },
      { headers: { "Set-Cookie": await clearedFlashCookie() } },
    );
  }
  return { locale, theme, flash: null };
}

export function Layout({ children }: { children: React.ReactNode }) {
  // The i18next provider lives here — not in a custom `entry.server`/
  // `entry.client` — because `Layout` wraps both `<App>` and the
  // `ErrorBoundary` and runs on the server and the client.
  //
  // On the client we reuse `browserI18n` (built once at module load, before
  // hydration); on the server we build a fresh instance per request. The
  // `useState` initializer runs once per mount, so the instance identity is
  // stable for the life of the document — the provider never swaps instances,
  // which is what avoids the first-paint flash. (Creating it in render via
  // `useMemo` doesn't: React may drop a memo and recreate the instance.)
  //
  // Locale comes from the root loader. `useRouteLoaderData` returns undefined
  // when the root loader didn't run (e.g. an error boundary render), so we fall
  // back. `<html lang>` is set from the locale value directly — no
  // `useTranslation` here, which is what keeps the provider's only consumers
  // *below* it.
  const data = useRouteLoaderData<typeof loader>("root");
  const locale = isSupportedLocale(data?.locale) ? data.locale : fallbackLng;
  const [i18n] = useState(() => browserI18n ?? createI18nInstance(locale));
  const dir = i18n.dir(locale);
  const theme = data?.theme ?? "system";
  const systemPrefersDark = useSystemPrefersDark();
  const themeClass = resolveThemeClass(theme, systemPrefersDark);

  return (
    // `suppressHydrationWarning` only matters for `theme === "system"`: the
    // blocking script below mutates this element's class after SSR, which
    // React would otherwise flag as a hydration mismatch. Explicit
    // light/dark never hits that path — server and client render the same
    // class from the same cookie.
    <html lang={locale} dir={dir} className={themeClass ?? undefined} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {theme === "system" ? (
          <script dangerouslySetInnerHTML={{ __html: THEME_SYSTEM_SCRIPT }} />
        ) : null}
        <Meta />
        <Links />
        <Pixels />
      </head>
      <body>
        <I18nextProvider i18n={i18n}>
          <TooltipProvider>{children}</TooltipProvider>
          {/* Anchor + close-button + exit all mirror in RTL (bottom-inline-end). */}
          <Toaster
            dir={dir}
            position={dir === "rtl" ? "bottom-left" : "bottom-right"}
          />
        </I18nextProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // Toast anything a redirect flashed (global error/success pass-through). No
  // fixed toast id, so successive flashes STACK rather than replace; the ref
  // guard fires each flash exactly once (and absorbs dev StrictMode's
  // double-invoke, which re-runs the effect with the same `flash` object).
  const { flash } = useLoaderData<typeof loader>();
  const handledFlash = useRef<unknown>(null);
  useEffect(() => {
    if (!flash || handledFlash.current === flash) return;
    handledFlash.current = flash;
    if (flash.error) toast.error(flash.error);
    else if (flash.success) toast.success(flash.success);
  }, [flash]);

  // The provider self-gates on VITE_POSTHOG_KEY (renders children only when
  // unset) and configures person-level attribution capture — see
  // `~/tracking/posthog-provider`.
  return (
    <PostHogProvider>
      {/* Top-of-viewport navigation indicator — navigation-only (no fetchers). */}
      <GlobalPendingBar />
      <Outlet />
    </PostHogProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // The last-resort boundary — errors outside the app shell (or thrown by the
  // shell itself) land here full-screen. Shell-scoped errors are caught nearer,
  // by the `_project` boundary, which keeps the chrome.
  const content = useErrorContent(error);
  return (
    <main className="flex min-h-svh flex-col">
      <ErrorState {...content} />
    </main>
  );
}
