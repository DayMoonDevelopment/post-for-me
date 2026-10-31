import { describe, expect, it } from "vitest";

import { formResolver, type FormSchema } from "./schema";
import { cleanPayload } from "./utils";

const createValues = (): FormSchema => ({
  social_accounts: ["facebook-account", "instagram-account"],
  caption: "A test post",
  media: [{ url: "https://example.com/image.jpg", name: "image.jpg" }],
  _providers: ["facebook", "instagram"],
  _disclose_content: false,
  platform_configurations: {
    youtube: { privacy_status: "public" },
    pinterest: { link: "https://example.com", board_ids: ["board"] },
    tiktok: { privacy_status: "public" },
  },
});

const validate = (values: FormSchema) =>
  formResolver(values, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
  });

describe("composer platform configurations", () => {
  it("omits all unselected platforms from the preview and submitted payload", async () => {
    const values = createValues();
    const result = await validate(values);

    expect(result.errors).toEqual({});
    expect(cleanPayload(values)).toEqual({
      social_accounts: values.social_accounts,
      caption: values.caption,
      media: [{ url: "https://example.com/image.jpg" }],
    });
    expect(cleanPayload(result.values as FormSchema)).toEqual(
      cleanPayload(values),
    );
  });

  it("ignores cleared privacy and invalid settings on unselected platforms", async () => {
    const values = createValues();
    // Radix single-select toggles emit an empty string when deselected.
    Object.assign(values.platform_configurations!.youtube!, {
      privacy_status: "",
    });
    Object.assign(values.platform_configurations!.tiktok!, {
      privacy_status: "",
    });
    values.platform_configurations!.pinterest!.link = "not a URL";
    values._disclose_content = true;

    expect((await validate(values)).errors).toEqual({});
    expect(cleanPayload(values)).not.toHaveProperty("platform_configurations");
  });

  it.each(["youtube", "pinterest", "tiktok"] as const)(
    "keeps only %s configuration when its account is selected",
    async (provider) => {
      const values = createValues();
      values._providers!.push(provider, provider);
      values.social_accounts.push(
        `${provider}-account`,
        `${provider}-account-2`,
      );

      const result = await validate(values);
      expect(result.errors).toEqual({});
      expect(cleanPayload(values).platform_configurations).toEqual({
        [provider]: values.platform_configurations![provider],
      });
      expect(cleanPayload(result.values as FormSchema)).toEqual(
        cleanPayload(values),
      );
    },
  );

  it("validates Pinterest settings only while Pinterest is selected", async () => {
    const values = createValues();
    values.platform_configurations!.pinterest!.link = "not a URL";
    values._providers = ["pinterest"];

    expect((await validate(values)).errors).toHaveProperty(
      "platform_configurations.pinterest.link",
    );

    values._providers = ["facebook", "instagram"];
    expect((await validate(values)).errors).toEqual({});
  });

  it("still rejects invalid privacy for a selected YouTube account", async () => {
    const values = createValues();
    values._providers = ["youtube"];
    Object.assign(values.platform_configurations!.youtube!, {
      privacy_status: "invalid",
    });

    expect((await validate(values)).errors).toHaveProperty(
      "platform_configurations.youtube.privacy_status",
    );
  });

  it("preserves TikTok privacy and disclosure requirements for selected TikTok accounts", async () => {
    const values = createValues();
    values._providers = ["tiktok"];
    values.platform_configurations!.tiktok!.privacy_status = undefined;
    expect((await validate(values)).errors).not.toEqual({});

    values.platform_configurations!.tiktok!.privacy_status = "public";
    values._disclose_content = true;
    expect((await validate(values)).errors).not.toEqual({});

    values.platform_configurations!.tiktok!.disclose_your_brand = true;
    expect((await validate(values)).errors).toEqual({});
  });

  it("does not mutate settings when accounts are deselected and reselected", async () => {
    const values = createValues();
    const settings = structuredClone(values.platform_configurations);

    await validate(values);
    cleanPayload(values);
    expect(values.platform_configurations).toEqual(settings);

    values._providers = ["youtube"];
    expect(cleanPayload(values).platform_configurations).toEqual({
      youtube: settings!.youtube,
    });
  });

  it("still rejects missing accounts and captions", async () => {
    const values = createValues();
    values.social_accounts = [];
    values.caption = "";
    values._providers = [];

    const result = await validate(values);
    expect(result.errors).toHaveProperty("social_accounts");
    expect(result.errors).toHaveProperty("caption");
    expect(cleanPayload(values)).not.toHaveProperty("platform_configurations");
  });
});
