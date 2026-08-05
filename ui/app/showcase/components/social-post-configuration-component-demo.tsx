"use client";

import { useState } from "react";

import { SocialPostConfiguration } from "~/components/social-post-configuration";
import type { SocialAccount } from "~/lib/post-for-me.types";
import type { SocialPostConfiguration as SocialPostConfigurationValue } from "~/lib/social-post-configuration.types";

const ACCOUNTS: SocialAccount[] = [
  { id: "ig", platform: "instagram", username: "acme", displayName: "Acme" },
  { id: "ig-shop", platform: "instagram", username: "acme.shop", displayName: "Acme Shop" },
  { id: "tt", platform: "tiktok", username: "acme" },
  { id: "pin", platform: "pinterest", username: "acme" },
];

/** The accordion configuration, driven by (and validated against) the hook. */
export function SocialPostConfigurationAccordionDemo() {
  const [value, setValue] = useState<SocialPostConfigurationValue>({});
  return (
    <div className="w-full max-w-md">
      <SocialPostConfiguration
        accounts={ACCOUNTS}
        value={value}
        onValueChange={setValue}
      />
    </div>
  );
}
