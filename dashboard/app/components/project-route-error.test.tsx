import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { ProjectRouteError } from "./project-route-error";

function render(error: unknown) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ["/team/project/accounts/connect"] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/:teamId/:projectId/accounts/connect",
          element: createElement(ProjectRouteError, { error }),
        }),
      ),
    ),
  );
}

describe("project error fallback", () => {
  it("renders approved copy, a reference and recovery actions for server errors", () => {
    const html = render({
      status: 503,
      statusText: "",
      internal: false,
      data: {
        code: "CREDENTIALS_LOAD_FAILED",
        referenceId: "d6e338cd-5f34-4ff4-836f-cea21b01ec63",
        message: "secret",
      },
    });
    expect(html).toContain("connection options");
    expect(html).toContain("d6e338cd-5f34-4ff4-836f-cea21b01ec63");
    expect(html).toContain("Try again");
    expect(html).toContain('href="/team/project/accounts"');
    expect(html).not.toContain("secret");
    expect(html).not.toContain("Oops");
  });

  it("offers sign-in rather than retrying an expired session", () => {
    const html = render({
      status: 401,
      statusText: "",
      internal: false,
      data: { code: "SESSION_EXPIRED" },
    });
    expect(html).toContain('href="/logout"');
    expect(html).toContain("Sign in again");
    expect(html).not.toContain("Try again");
  });
});
