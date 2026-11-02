import { RocketIcon } from "~/icons";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/avatar";
import { InstagramIcon } from "~/ui/brand-mark";

import { Section } from "./section";

export function AvatarDemo() {
  return (
    <div className="space-y-8">
      <Section title="Shapes — circle (default) · rounded (className)">
        <div className="flex items-center gap-4">
          <Avatar className="size-10">
            <AvatarFallback>CD</AvatarFallback>
          </Avatar>
          <Avatar className="size-10 rounded-lg">
            <AvatarFallback>CD</AvatarFallback>
          </Avatar>
        </div>
      </Section>

      <Section title="Content — image · initials · icon · brand">
        <div className="flex items-center gap-4">
          <Avatar className="size-10">
            <AvatarImage src="https://i.pravatar.cc/80?img=12" alt="" />
            <AvatarFallback>CD</AvatarFallback>
          </Avatar>
          <Avatar className="size-10">
            <AvatarFallback className="bg-pop font-heading font-semibold text-white">
              C
            </AvatarFallback>
          </Avatar>
          <Avatar className="size-10 rounded-lg" data-brand="quickstart">
            <AvatarFallback className="bg-primary/10 text-primary [&_svg]:size-5">
              <RocketIcon />
            </AvatarFallback>
          </Avatar>
          <Avatar className="size-10 rounded-lg">
            <AvatarFallback className="bg-muted text-muted-foreground [&_svg]:size-5">
              <InstagramIcon />
            </AvatarFallback>
          </Avatar>
        </div>
      </Section>

      <Section title="Decorators">
        <p className="text-xs text-muted-foreground">
          The base primitive is shape-agnostic and clips to its rounding. Status
          dots and platform badges live on the domain avatars — see the User
          Avatar and Platform Avatar demos.
        </p>
      </Section>
    </div>
  );
}
