import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import { ToastManager } from "~/components/toast-manager";

import { Pixels } from "./tracking/pixels";
import { PostHogProvider } from "./tracking/posthog-provider";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap",
  },
  {
    rel: "apple-touch-icon",
    href: "/apple-touch-icon.png",
    sizes: "180x180",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/favicon-32x32.png",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    href: "/favicon-16x16.png",
  },
  {
    rel: "manifest",
    href: "/site.webmanifest",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  // Optional chaining because Layout also renders for error boundaries where
  // the root loader may not have run successfully.
  const data = useLoaderData<typeof loader>();
  const googleAdsTagId = data?.googleAdsTagId;
  const metaPixelId = data?.metaPixelId;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <Pixels googleAdsTagId={googleAdsTagId} metaPixelId={metaPixelId} />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `window.$crisp=[];window.CRISP_WEBSITE_ID="4c875ebc-b308-4e5c-ac80-0c86b773f989";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <ToastManager />
      </body>
    </html>
  );
}

export const loader = async () => {
  return {
    postHogApiKey: process.env.POST_HOG_API_KEY,
    postHogApiHost: process.env.POST_HOG_API_HOST,
    googleAdsTagId: process.env.GOOGLE_ADS_TAG_ID,
    metaPixelId: process.env.META_PIXEL_ID,
  };
};

export default function App() {
  const { postHogApiKey, postHogApiHost } = useLoaderData<typeof loader>();

  return (
    <PostHogProvider apiKey={postHogApiKey} apiHost={postHogApiHost}>
      <Outlet />
    </PostHogProvider>
  );
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
    <main className="pt-16 p-4 container mx-auto flex flex-col gap-2 items-center justify-center text-center">
      <img src="/error.png" className="h-32" />
      <h1 className="text-2xl font-bold">{message}</h1>
      <p>{details}</p>
      {stack ? (
        <pre className="w-full p-4 overflow-x-auto bg-muted text-muted-foreground border rounded-lg text-left font-mono">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
