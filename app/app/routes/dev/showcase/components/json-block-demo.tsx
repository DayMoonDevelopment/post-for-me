import { JsonBlock } from "~/ui/json-block";

import { Section } from "./section";

const SAMPLE = {
  id: "spr_ahK6ghf7GyYd8hUm7glO",
  success: false,
  provider: "facebook",
  error: "The access token for this account has expired.",
  requests: [
    {
      url: "https://graph.facebook.com/v20.0/551863281348648/photos",
      params: { fields: "permalink_url", published: false },
    },
  ],
  meta: { attempt: 1, retryable: true, tags: ["media", "image"] },
};

export function JsonBlockDemo() {
  return (
    <div className="space-y-8">
      <Section title="Object">
        <div className="max-w-lg">
          <JsonBlock value={SAMPLE} />
        </div>
      </Section>

      <Section title="Array">
        <div className="max-w-lg">
          <JsonBlock value={[1, "two", true, null, { nested: "value" }]} />
        </div>
      </Section>

      <Section title="Scalar">
        <div className="max-w-lg">
          <JsonBlock value="just a string" />
        </div>
      </Section>
    </div>
  );
}
