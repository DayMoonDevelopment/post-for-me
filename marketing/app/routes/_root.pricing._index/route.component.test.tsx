import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Component } from "./route.component";
import { loader } from "./route.loader";

vi.mock("react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router")>();
  return {
    ...original,
    useLoaderData: () => loader(),
  };
});

function renderPricingPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  ).replace(/\s+/g, " ");
}

describe("pricing page upgrade terms", () => {
  it("reassures customers that exceeding limits does not stop posting or trigger an immediate charge", () => {
    const markup = renderPricingPage();

    expect(markup).toContain("We want you to succeed");
    expect(markup).toContain("shut you down or charge you extra immediately");
    expect(markup).not.toContain("charge you extra automatically");
  });

  it("explains the automatic next-tier upgrade and when the higher charge takes effect", () => {
    const markup = renderPricingPage();

    expect(markup).toContain(
      "automatically upgrade you to the next tier at the start of your next billing cycle",
    );
    expect(markup).toContain("when the higher-tier charge takes effect");
    expect(markup).not.toContain("consistently exceeding the limits");
  });
});
