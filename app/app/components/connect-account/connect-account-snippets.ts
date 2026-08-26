import type { CodeSamples } from "~/components/code-panel";

/**
 * The `createAuthURL` code samples shown in the connect-account modal's code
 * panel — one builder per Post for Me SDK plus raw cURL, keyed by the shared
 * {@link ~/components/code-panel CodePanel} language ids. Each mirrors the live
 * setup form: `platform`, an optional `external_id`, the chosen `permissions`,
 * and any provider-specific `platform_data` (Instagram/LinkedIn connection type,
 * Bluesky credentials) only appear once they apply.
 *
 * These are illustrative samples — kept faithful to each SDK's published shape
 * (method + field names), not wired to run.
 */

/** A `platform_data.<provider>` block, with the field names each SDK expects
 * (snake_case for TS/Python/Ruby/cURL, `goKey` PascalCase + `goField` struct for
 * Go). */
export type ConnectPlatformData = {
  fields: Array<{ goKey: string; key: string; value: string }>;
  /** Go struct/field name, e.g. `Instagram`. */
  goField: string;
  /** snake_case provider key, e.g. `instagram`. */
  provider: string;
};

export type ConnectSnippetInput = {
  externalId: string;
  /** Selected permission scopes, or `null` to omit the field (e.g. Bluesky). */
  permissions: string[] | null;
  platform: string;
  platformData: ConnectPlatformData | null;
};

export function instagramPlatformData(connectionType: string): ConnectPlatformData {
  return {
    provider: "instagram",
    goField: "Instagram",
    fields: [{ key: "connection_type", goKey: "ConnectionType", value: connectionType }],
  };
}

export function linkedinPlatformData(connectionType: string): ConnectPlatformData {
  return {
    provider: "linkedin",
    goField: "Linkedin",
    fields: [{ key: "connection_type", goKey: "ConnectionType", value: connectionType }],
  };
}

export function blueskyPlatformData(
  handle: string,
  appPassword: string,
): ConnectPlatformData {
  return {
    provider: "bluesky",
    goField: "Bluesky",
    fields: [
      { key: "handle", goKey: "Handle", value: handle },
      { key: "app_password", goKey: "AppPassword", value: appPassword },
    ],
  };
}

const quotedList = (items: string[]) => items.map((i) => `"${i}"`).join(", ");

function typescriptSnippet(input: ConnectSnippetInput): string {
  const params = [`  platform: "${input.platform}",`];
  if (input.externalId) params.push(`  external_id: "${input.externalId}",`);
  if (input.permissions) {
    params.push(`  permissions: [${quotedList(input.permissions)}],`);
  }
  if (input.platformData) {
    params.push(`  platform_data: {`);
    params.push(`    ${input.platformData.provider}: {`);
    for (const f of input.platformData.fields) {
      params.push(`      ${f.key}: "${f.value}",`);
    }
    params.push(`    },`);
    params.push(`  },`);
  }
  return [
    `// Run this code server-side.`,
    `import PostForMe from "post-for-me";`,
    ``,
    `const postForMeClient = new PostForMe({`,
    `  apiKey: process.env.POST_FOR_ME_API_KEY,`,
    `});`,
    ``,
    `const { url } = await postForMeClient.socialAccounts.createAuthURL({`,
    ...params,
    `});`,
    ``,
    "// Redirect the user to `url` to finish connecting their account.",
  ].join("\n");
}

function pythonSnippet(input: ConnectSnippetInput): string {
  const params = [`    platform="${input.platform}",`];
  if (input.externalId) params.push(`    external_id="${input.externalId}",`);
  if (input.permissions) {
    params.push(`    permissions=[${quotedList(input.permissions)}],`);
  }
  if (input.platformData) {
    params.push(`    platform_data={`);
    params.push(`        "${input.platformData.provider}": {`);
    for (const f of input.platformData.fields) {
      params.push(`            "${f.key}": "${f.value}",`);
    }
    params.push(`        },`);
    params.push(`    },`);
  }
  return [
    `# Run this code server-side.`,
    `import os`,
    `from post_for_me import PostForMe`,
    ``,
    `post_for_me_client = PostForMe(`,
    `    api_key=os.environ.get("POST_FOR_ME_API_KEY"),`,
    `)`,
    ``,
    `response = post_for_me_client.social_accounts.create_auth_url(`,
    ...params,
    `)`,
    ``,
    "# Redirect the user to `response.url` to finish connecting their account.",
  ].join("\n");
}

function rubySnippet(input: ConnectSnippetInput): string {
  // Ruby allows trailing commas in hashes / kwargs, so nesting stays simple.
  const params = [`  platform: "${input.platform}",`];
  if (input.externalId) params.push(`  external_id: "${input.externalId}",`);
  if (input.permissions) {
    params.push(`  permissions: [${quotedList(input.permissions)}],`);
  }
  if (input.platformData) {
    params.push(`  platform_data: {`);
    params.push(`    ${input.platformData.provider}: {`);
    for (const f of input.platformData.fields) {
      params.push(`      ${f.key}: "${f.value}",`);
    }
    params.push(`    },`);
    params.push(`  },`);
  }
  return [
    `# Run this code server-side.`,
    `require "post_for_me"`,
    ``,
    `post_for_me_client = PostForMe::Client.new(api_key: ENV["POST_FOR_ME_API_KEY"])`,
    ``,
    `response = post_for_me_client.social_accounts.create_auth_url(`,
    ...params,
    `)`,
    ``,
    "# Redirect the user to `response.url` to finish connecting their account.",
  ].join("\n");
}

function goSnippet(input: ConnectSnippetInput): string {
  const params = [`\t\tPlatform: "${input.platform}",`];
  if (input.externalId) params.push(`\t\tExternalID: "${input.externalId}",`);
  if (input.permissions) {
    params.push(`\t\tPermissions: []string{${quotedList(input.permissions)}},`);
  }
  if (input.platformData) {
    const pd = input.platformData;
    params.push(
      `\t\tPlatformData: postforme.SocialAccountNewAuthURLParamsPlatformData{`,
    );
    params.push(
      `\t\t\t${pd.goField}: postforme.SocialAccountNewAuthURLParamsPlatformData${pd.goField}{`,
    );
    for (const f of pd.fields) {
      params.push(`\t\t\t\t${f.goKey}: "${f.value}",`);
    }
    params.push(`\t\t\t},`);
    params.push(`\t\t},`);
  }
  return [
    `// Run this code server-side.`,
    ``,
    `package main`,
    ``,
    `import (`,
    `\t"context"`,
    `\t"fmt"`,
    ``,
    `\t"github.com/DayMoonDevelopment/post-for-me-go"`,
    `\t"github.com/DayMoonDevelopment/post-for-me-go/option"`,
    `)`,
    ``,
    `func main() {`,
    `\tpostForMeClient := postforme.NewClient(`,
    `\t\toption.WithAPIKey("YOUR_API_KEY"),`,
    `\t)`,
    ``,
    `\tresponse, err := postForMeClient.SocialAccounts.NewAuthURL(context.TODO(), postforme.SocialAccountNewAuthURLParams{`,
    ...params,
    `\t})`,
    `\tif err != nil {`,
    `\t\tpanic(err.Error())`,
    `\t}`,
    ``,
    `\t// Redirect the user to response.URL to finish connecting their account.`,
    `\tfmt.Println(response.URL)`,
    `}`,
  ].join("\n");
}

function curlSnippet(input: ConnectSnippetInput): string {
  // Build the JSON body as an object so nesting + comma rules are handled for us.
  const body: Record<string, unknown> = { platform: input.platform };
  if (input.externalId) body.external_id = input.externalId;
  if (input.permissions) body.permissions = input.permissions;
  if (input.platformData) {
    body.platform_data = {
      [input.platformData.provider]: Object.fromEntries(
        input.platformData.fields.map((f) => [f.key, f.value]),
      ),
    };
  }
  // Indent every line by 2 so the body nests under the `-d` flag; the leading
  // `{` sits right after `-d '`.
  const json = JSON.stringify(body, null, 2)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")
    .trimStart();

  return [
    `# Run this code server-side.`,
    `curl -X POST https://api.postforme.dev/v1/social-accounts/auth-url \\`,
    `  -H "Authorization: Bearer $POST_FOR_ME_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${json}'`,
    ``,
    `# Redirect the user to the returned url to finish connecting their account.`,
  ].join("\n");
}

const BUILDERS = {
  typescript: typescriptSnippet,
  python: pythonSnippet,
  ruby: rubySnippet,
  go: goSnippet,
  curl: curlSnippet,
} as const;

/** The connect-account `createAuthURL` samples across every supported language,
 * ready to hand to a {@link ~/components/code-panel CodePanel}. */
export function buildConnectSamples(input: ConnectSnippetInput): CodeSamples {
  return {
    typescript: BUILDERS.typescript(input),
    python: BUILDERS.python(input),
    ruby: BUILDERS.ruby(input),
    go: BUILDERS.go(input),
    curl: BUILDERS.curl(input),
  };
}
