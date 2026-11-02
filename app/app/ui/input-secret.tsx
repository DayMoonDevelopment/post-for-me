import * as React from "react";

import { EyeIcon, EyeOffIcon } from "~/icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/ui/input-group";

/**
 * A masked text input for secret values (app secrets, API keys), composed from
 * the {@link InputGroup} primitive: a masked control + a trailing reveal toggle.
 *
 * Deliberately NOT `type="password"`: that's the signal the OS/browser password
 * manager (iCloud Keychain, 1Password, …) uses to offer autofill, "save
 * password", and strong-password suggestions — none of which apply here, since
 * these secrets are pasted from a developer portal, not site login credentials.
 * Instead we render a plain text field masked with `-webkit-text-security`.
 * `autocomplete="new-password"` (a real token, unlike the ignored `off`)
 * suppresses saved-credential/contact autofill on text fields too; pass a
 * meaningless `id`/`name` so the manager's keyword heuristics don't latch on.
 */
function InputSecret({
  className,
  style,
  revealLabel = "Show",
  hideLabel = "Hide",
  ...props
}: React.ComponentProps<typeof InputGroupInput> & {
  hideLabel?: string;
  revealLabel?: string;
}) {
  const [revealed, setRevealed] = React.useState(false);
  return (
    <InputGroup className={className}>
      <InputGroupInput
        {...props}
        type="text"
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore=""
        data-lpignore="true"
        data-form-type="other"
        style={
          revealed
            ? style
            : ({ ...style, WebkitTextSecurity: "disc" } as React.CSSProperties)
        }
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          tabIndex={-1}
          aria-label={revealed ? hideLabel : revealLabel}
          aria-pressed={revealed}
          onClick={() => setRevealed((value) => !value)}
          className="text-muted-foreground"
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { InputSecret };
