import { CodeBlock } from "~/ui/code-block";

import { Section } from "./section";

const SAMPLE = `import PostForMe from "post-for-me";

const client = new PostForMe({
  apiKey: process.env.POST_FOR_ME_API_KEY,
});

const { url } = await client.socialAccounts.createAuthURL({
  platform: "instagram",
});

// Redirect the user to \`url\` to connect their account.`;

export function CodeBlockDemo() {
  return (
    <div className="space-y-8">
      <Section title="Surface (standalone, highlighted)">
        <div className="max-w-lg">
          <CodeBlock language="TypeScript" syntax="typescript" code={SAMPLE} />
        </div>
      </Section>

      <Section title="Surfaceless (embedded in a distinguished panel)">
        <div className="max-w-lg overflow-hidden rounded-lg bg-muted/50">
          <CodeBlock
            language="TypeScript"
            syntax="typescript"
            code={SAMPLE}
            surface={false}
          />
        </div>
      </Section>

      <Section title="Plain (no syntax)">
        <div className="max-w-lg">
          <CodeBlock language="Text" code={SAMPLE} />
        </div>
      </Section>
    </div>
  );
}
