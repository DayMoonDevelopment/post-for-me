import {
  ConnectAccountModal,
  ConnectAccountModalTrigger,
  type PlatformConnectStatusMap,
} from "~/components/connect-account";

import { Section } from "./section";

// A representative readiness mix so the disabled/incomplete states are visible;
// real usage derives this from the project's configured provider credentials.
const PLATFORM_STATUS: PlatformConnectStatusMap = {
  instagram: "ready",
  facebook: "ready",
  x: "ready",
  tiktok: "ready",
  linkedin: "ready",
  bluesky: "ready",
  youtube: "incomplete",
  threads: "unconfigured",
  // pinterest omitted → treated as unconfigured
};

export function ConnectAccountModalDemo() {
  return (
    <Section title="Two-panel connect flow">
      <ConnectAccountModal
        trigger={<ConnectAccountModalTrigger />}
        platforms={PLATFORM_STATUS}
      />
    </Section>
  );
}
