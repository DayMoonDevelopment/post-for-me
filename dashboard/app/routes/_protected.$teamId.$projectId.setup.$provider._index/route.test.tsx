import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("~/lib/.server/supabase", () => ({
  withSupabase: (handler: unknown) => handler,
}));

const state = vi.hoisted(() => ({
  provider: "tiktok_business",
  credential: { appId: "", appSecret: "" },
}));

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useParams: () => ({ provider: state.provider }),
  useLoaderData: () => ({
    credential: state.credential,
    redirectUrl:
      "https://app.postforme.dev/callback/project-1/tiktok_business/account/",
    setupGuideUrl: "https://example.com/guide",
  }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("~/ui/dialog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/ui/dialog")>()),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("~/hooks/use-form", () => ({
  useForm: () => ({ fetcher: { state: "idle" }, isSubmitting: false }),
}));

import { Component } from "./route.component";
import { loader } from "./route.loader";
import { action } from "./route.action";

function createSupabaseMock() {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({ data: { auth_callback_url: null } }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { app_id: "business-app", app_secret: "business-secret" },
    }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn(() => chain),
  };
  return {
    chain,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn(() => chain),
  };
}

describe("TikTok Business provider setup", () => {
  beforeEach(() => {
    state.provider = "tiktok_business";
    state.credential = { appId: "", appSecret: "" };
  });

  it("shows credentials, a masked secret, and the early-access disclaimer", () => {
    const html = renderToStaticMarkup(<Component />);
    expect(html).toContain("Setup TikTok Business");
    expect(html).toContain("App ID");
    expect(html).toContain("App Secret");
    expect(html).toContain('type="password"');
    expect(html).toContain("Save Configuration");
    expect(html).toContain("Full integration coming soon");
    expect(html).toContain("mailto:postforme@daymoon.dev");
    expect(html).not.toContain("setup guide");
  });

  it("allows editing and deleting existing credentials", () => {
    state.credential = { appId: "business-app", appSecret: "business-secret" };
    const html = renderToStaticMarkup(<Component />);
    expect(html).toContain('value="business-app"');
    expect(html).toContain('value="business-secret"');
    expect(html).toContain(">Edit</button>");
    expect(html).toContain(">Delete</button>");
  });

  it("keeps the setup guide for other providers", () => {
    state.provider = "facebook";
    const html = renderToStaticMarkup(<Component />);
    expect(html).toContain("setup guide");
    expect(html).not.toContain("Full integration coming soon");
  });

  it.each(["tiktok_business", "facebook"])(
    "loads %s credentials and redirect URL",
    async (provider) => {
      const supabase = createSupabaseMock();
      const result = await loader({
        params: { teamId: "team-1", projectId: "project-1", provider },
        supabase,
      } as unknown as Parameters<typeof loader>[0]);

      expect(supabase.chain.eq).toHaveBeenCalledWith("provider", provider);
      expect(result.data.credential).toEqual({
        appId: "business-app",
        appSecret: "business-secret",
      });
      expect(result.data.redirectUrl).toBe(
        `https://app.postforme.dev/callback/project-1/${provider}/account${provider === "tiktok_business" ? "/" : ""}`,
      );
    },
  );

  it("saves credentials against the project's TikTok Business provider", async () => {
    const supabase = createSupabaseMock();
    const formData = new FormData();
    formData.set("app_id", "business-app");
    formData.set("app_secret", "business-secret");
    const result = await action({
      params: { projectId: "project-1", provider: "tiktok_business" },
      request: new Request("https://example.com/setup/tiktok_business", {
        method: "POST",
        body: formData,
      }),
      supabase,
    } as unknown as Parameters<typeof action>[0]);

    expect(result.data.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith(
      "social_provider_app_credentials",
    );
    expect(supabase.chain.upsert).toHaveBeenCalledWith(
      {
        project_id: "project-1",
        provider: "tiktok_business",
        app_id: "business-app",
        app_secret: "business-secret",
      },
      { onConflict: "provider,project_id" },
    );
  });

  it("rejects an empty credential submission", async () => {
    const supabase = createSupabaseMock();
    const result = await action({
      params: { projectId: "project-1", provider: "tiktok_business" },
      request: new Request("https://example.com/setup/tiktok_business", {
        method: "POST",
        body: new FormData(),
      }),
      supabase,
    } as unknown as Parameters<typeof action>[0]);

    expect(result.data.success).toBe(false);
    expect(supabase.chain.upsert).not.toHaveBeenCalled();
  });
});
