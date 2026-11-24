import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarIconBadge,
  UserAvatarStatusBadge,
} from "~/components/user-avatar";
import { type AvatarSize } from "~/lib/avatar";
import { BrandMark } from "~/ui/brand-mark";
import { StatusIndicator } from "~/ui/status-indicator";

import { Section } from "./section";

const SIZES: AvatarSize[] = ["sm", "default", "lg"];

/** A code-ish caption so reviewers can see the structure at a glance. */
function Structure({ children }: { children: string }) {
  return (
    <pre className="w-full overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
      {children}
    </pre>
  );
}

export function UserAvatarDemo() {
  return (
    <div className="space-y-8">
      <Section title="Fills — photo · soft default · prominent (sidebar one-off)">
        <div className="flex items-center gap-4">
          <UserAvatar
            name="With photo"
            src="https://i.pravatar.cc/80?img=12"
            size="lg"
          />
          <UserAvatar name="Soft Default" size="lg" />
          <UserAvatar name="Prominent" variant="prominent" size="lg" />
          {/* No name → generic user icon (the final fallback). */}
          <UserAvatar size="lg" />
        </div>
      </Section>

      <Section title="Size scale (sm → lg) — the status dot scales with it">
        <div className="flex items-end gap-4">
          {SIZES.map((size) => (
            <div key={size} className="flex flex-col items-center gap-1.5">
              <UserAvatar name="A B" size={size}>
                <UserAvatarBadge>
                  <UserAvatarStatusBadge>
                    <StatusIndicator status="success" />
                  </UserAvatarStatusBadge>
                </UserAvatarBadge>
              </UserAvatar>
              <span className="text-[0.625rem] text-muted-foreground">
                {size}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Decorators — status only vs. status + platform">
        <div className="flex items-center gap-4">
          {/* Status only → the dot sits in the lower-trailing corner (default). */}
          <UserAvatar name="A B" size="lg">
            <UserAvatarBadge>
              <UserAvatarStatusBadge>
                <StatusIndicator status="success" />
              </UserAvatarStatusBadge>
            </UserAvatarBadge>
          </UserAvatar>
          {/* With a platform badge, the status dot moves to the upper-leading
              corner (secondary) and the platform mark takes the lower-trailing. */}
          <UserAvatar name="C D" size="lg">
            <UserAvatarBadge placement="secondary">
              <UserAvatarStatusBadge>
                <StatusIndicator status="success" />
              </UserAvatarStatusBadge>
            </UserAvatarBadge>
            <UserAvatarBadge>
              <UserAvatarIconBadge>
                <BrandMark platform="instagram" />
              </UserAvatarIconBadge>
            </UserAvatarBadge>
          </UserAvatar>
          <UserAvatar name="E F" size="lg">
            <UserAvatarBadge placement="secondary">
              <UserAvatarStatusBadge>
                <StatusIndicator status="warning" />
              </UserAvatarStatusBadge>
            </UserAvatarBadge>
            <UserAvatarBadge>
              <UserAvatarIconBadge>
                <BrandMark platform="tiktok" />
              </UserAvatarIconBadge>
            </UserAvatarBadge>
          </UserAvatar>
          <UserAvatar name="G H" size="lg">
            <UserAvatarBadge placement="secondary">
              <UserAvatarStatusBadge>
                <StatusIndicator status="destructive" />
              </UserAvatarStatusBadge>
            </UserAvatarBadge>
            <UserAvatarBadge>
              <UserAvatarIconBadge>
                <BrandMark platform="x" />
              </UserAvatarIconBadge>
            </UserAvatarBadge>
          </UserAvatar>
        </div>
      </Section>

      <Section title="Structure">
        <Structure>{`// USER identity → circle: image → 2-char initials → user icon.
// UserAvatarBadge POSITIONS a corner; the pre-styled content badges own their
// sizing + the "hole-punch" knockout and scale themselves to the avatar's size.
<UserAvatar name={username} src={avatarUrl} size="sm">
  <UserAvatarBadge>
    <UserAvatarStatusBadge>
      <StatusIndicator status="success" />
    </UserAvatarStatusBadge>
  </UserAvatarBadge>
</UserAvatar>

// with a platform badge, move the status dot to the upper-leading corner:
<UserAvatar name={username} src={avatarUrl}>
  <UserAvatarBadge placement="secondary">
    <UserAvatarStatusBadge>
      <StatusIndicator status="success" />
    </UserAvatarStatusBadge>
  </UserAvatarBadge>
  <UserAvatarBadge>
    <UserAvatarIconBadge>
      <BrandMark platform="instagram" />
    </UserAvatarIconBadge>
  </UserAvatarBadge>
</UserAvatar>`}</Structure>
      </Section>
    </div>
  );
}
