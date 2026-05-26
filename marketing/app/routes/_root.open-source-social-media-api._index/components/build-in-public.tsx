import { IconDiscord } from "@central-icons/filled";
import { IconArrowUpRight } from "@central-icons/outlined";

import { Link } from "~/components/link";
import { XBrandIcon } from "~/components/x-brand-icon";

import { Badge } from "~/ui/badge";

const DISCORD_URL = "https://discord.gg/Nv6xEZ2vP5";
const X_URL = "https://x.com/postforme_dev";

const channels = [
  {
    name: "Join the Discord",
    handle: "discord.gg/Nv6xEZ2vP5",
    description:
      "Drop into the channel where we ship. Ask questions, share what you're building, and see what we're working on before it lands.",
    href: DISCORD_URL,
    icon: IconDiscord,
  },
  {
    name: "Follow on X",
    handle: "@postforme_dev",
    description:
      "We post the build log in public. New features, weird bugs, what we learned shipping social media integrations across nine platforms.",
    href: X_URL,
    icon: XBrandIcon,
  },
];

export const BuildInPublic = () => {
  return (
    <div id="build-in-public" className="bg-background scroll-mt-16">
      <div className="max-w-(--breakpoint-xl) w-full py-20 px-4 mx-auto">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <Badge variant="outline">Building in public</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-[-0.03em] text-balance">
            Watch us build it. Talk to us while we&apos;re building it.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-balance">
            The work happens on GitHub. The conversation happens on Discord and
            X. Pick the channel that fits how you like to follow along.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {channels.map(({ name, handle, description, href, icon: Icon }) => (
            <Link
              key={name}
              to={href}
              target="_blank"
              className="group flex flex-col gap-4 p-6 md:p-8 rounded-2xl border bg-card hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center justify-center size-12 rounded-xl bg-muted">
                  <Icon className="size-6" />
                </div>
                <IconArrowUpRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold">{name}</h3>
                <p className="text-sm font-mono text-muted-foreground">
                  {handle}
                </p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
