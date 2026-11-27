import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import {
  renderToPipeableStream,
  type RenderToPipeableStreamOptions,
} from "react-dom/server";
import {
  ServerRouter,
  type EntryContext,
  type HandleErrorFunction,
} from "react-router";

import {
  getRequestReference,
  reportServerError,
} from "~/lib/.server/route-diagnostics";

export const streamTimeout = 5_000;

export const handleError: HandleErrorFunction = (error, { request }) => {
  reportServerError(error, request);
};

// Keep React Router's default Node streaming behavior, with structured reporting
// for both loader/action failures and errors raised after the shell is streamed.
export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  responseHeaders.set("X-Dashboard-Request-Id", getRequestReference(request));
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";
    const timeoutId = setTimeout(() => abort(), streamTimeout + 1000);
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              callback();
            },
          });
          body.on("close", () => clearTimeout(timeoutId));
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error) {
          clearTimeout(timeoutId);
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          // Initial-shell failures are reported by React Router's handleError.
          if (shellRendered) reportServerError(error, request);
        },
      },
    );
  });
}
