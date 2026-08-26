import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";

import { posthogSnippet } from "~/lib/analytics";
import { fallbackLng, isSupportedLocale } from "~/lib/i18n/config";
import { browserI18n, createI18nInstance } from "~/lib/i18n/i18n";
import { detectLocale } from "~/lib/i18n/locale.server";
import { TooltipProvider } from "~/ui/tooltip";

import type { Route } from "./+types/root";
import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  // The locale for this request. `Layout` reads it (via useRouteLoaderData) to
  // build the i18next instance and set <html lang>. Bundled resources → sync.
  return { locale: await detectLocale(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  // null unless VITE_POSTHOG_KEY is set — analytics is opt-in.
  const analytics = posthogSnippet();

  // Provider lives here (not entry.server/client) so it wraps both <App> and the
  // ErrorBoundary. On the client we reuse the pre-built `browserI18n` singleton.
  const data = useRouteLoaderData<typeof loader>("root");
  const locale = isSupportedLocale(data?.locale) ? data.locale : fallbackLng;
  const [i18n] = useState(() => browserI18n ?? createI18nInstance(locale));
  const dir = i18n.dir(locale);

  return (
    <html lang={locale} dir={dir}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Post for Me brand fonts (marketing + chrome). The docs previews swap
            their own font via the style configurator. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=IBM+Plex+Sans:wght@500;600;700&display=swap"
        />
        <Meta />
        <Links />
        {analytics ? (
          <script dangerouslySetInnerHTML={{ __html: analytics }} />
        ) : null}
      </head>
      <body>
        <I18nextProvider i18n={i18n}>
          <TooltipProvider>{children}</TooltipProvider>
        </I18nextProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">{message}</h1>
      <p className="text-muted-foreground">{details}</p>
      {stack ? (
        <pre className="max-w-3xl overflow-auto rounded border p-4 text-xs">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
