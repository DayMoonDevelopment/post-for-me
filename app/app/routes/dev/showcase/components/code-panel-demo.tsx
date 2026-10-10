import {
  CodePanel,
  type CodeSamples,
  CodeShowcase,
  CodeShowcaseAside,
  CodeShowcaseMain,
} from "~/components/code-panel";
import { Button } from "~/ui/button";

import { Section } from "./section";

const SAMPLES: CodeSamples = {
  typescript: `import PostForMe from "post-for-me";

const postForMeClient = new PostForMe({
  apiKey: process.env.POST_FOR_ME_API_KEY,
});

const { url } = await postForMeClient.socialAccounts.createAuthURL({
  platform: "instagram",
});`,
  python: `import os
from post_for_me import PostForMe

post_for_me_client = PostForMe(
    api_key=os.environ.get("POST_FOR_ME_API_KEY"),
)

response = post_for_me_client.social_accounts.create_auth_url(
    platform="instagram",
)`,
  curl: `curl -X POST https://api.postforme.dev/v1/social-accounts/auth-url \\
  -H "Authorization: Bearer $POST_FOR_ME_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "platform": "instagram" }'`,
};

export function CodePanelDemo() {
  return (
    <div className="space-y-8">
      <Section title="CodePanel — standalone (e.g. a pull-up code sheet)">
        <div className="flex h-72 max-w-xl flex-col overflow-hidden rounded-lg border border-border">
          <CodePanel samples={SAMPLES} className="min-h-0 flex-1" />
        </div>
      </Section>

      <Section title="CodeShowcase — UI + code split (side-by-side when wide, stacked when narrow)">
        <div className="flex h-96 max-w-4xl flex-col overflow-hidden rounded-lg border border-border">
          <CodeShowcase>
            <CodeShowcaseMain className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Action UI</h3>
              <p className="text-sm/relaxed text-muted-foreground">
                Any feature UI goes here; the code aside mirrors it. Resize to see
                it stack.
              </p>
              <Button className="self-start">Do the thing</Button>
            </CodeShowcaseMain>
            <CodeShowcaseAside>
              <CodePanel samples={SAMPLES} className="min-h-0 flex-1" />
            </CodeShowcaseAside>
          </CodeShowcase>
        </div>
      </Section>
    </div>
  );
}
