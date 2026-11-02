"use client";

import { type ReactNode, useState } from "react";

import type { SocialAccount } from "~/lib/post-for-me.types";
import type { SocialPostConfiguration as SocialPostConfigurationValue } from "~/lib/social-post-configuration.types";

import { PlatformAvatar } from "~/components/platform-avatar";
import { UserAvatar } from "~/components/user-avatar";
import {
  SocialPostConfigurationProvider,
  useSocialPostConfigurationContext,
} from "~/hooks/use-social-post-configuration";
import { ChevronRightIcon as ChevronRight } from "~/icons";
import {
  SOCIAL_POST_CONFIGURATION_GROUP_LABELS,
  SOCIAL_POST_CONFIGURATION_GROUP_ORDER,
  type SocialPostConfigurationField,
} from "~/lib/social-post-configuration.schema";
import { cn } from "~/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/ui/accordion";
import { Button } from "~/ui/button";
import { ButtonGroup } from "~/ui/button-group";
import { Checkbox } from "~/ui/checkbox";
import { Input } from "~/ui/input";
import { Label } from "~/ui/label";
import { StatusIndicator } from "~/ui/status-indicator";
import { Switch } from "~/ui/switch";
import { Textarea } from "~/ui/textarea";

type ConfigValue = string | number | boolean | string[] | undefined;

/** Whether a value counts as filled — used for required-field validity. */
function hasValue(value: ConfigValue): boolean {
  return !(
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** One configuration field, rendered with the control the schema suggests. */
function Field({
  field,
  value,
  values,
  onChange,
}: {
  field: SocialPostConfigurationField;
  onChange: (next: ConfigValue) => void;
  value: ConfigValue;
  values: Record<string, unknown>;
}) {
  const disabled = field.disabledWhen?.(values) ?? false;

  if (field.control === "switch") {
    return (
      <label
        className={cn("flex items-center gap-2 text-sm", disabled && "opacity-50")}
      >
        <Checkbox
          checked={value === true}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        {field.label}
      </label>
    );
  }

  const label = (
    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {field.label}
      {field.required ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-foreground/70">
          Required
        </span>
      ) : null}
    </Label>
  );

  if (field.control === "segmented" || field.control === "select") {
    return (
      <div className="grid gap-1.5">
        {label}
        <ButtonGroup>
          {field.options?.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              disabled={disabled || (option.disabledWhen?.(values) ?? false)}
              variant={value === option.value ? "default" : "outline"}
              onClick={() =>
                onChange(value === option.value ? undefined : option.value)
              }
            >
              {option.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    );
  }

  if (field.control === "tags" || field.control === "board") {
    const list = Array.isArray(value) ? value : [];
    return (
      <div className="grid gap-1.5">
        {label}
        <Input
          placeholder={field.help ?? "Comma separated"}
          value={list.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      {label}
      <Input
        maxLength={field.maxLength}
        placeholder={field.placeholder ?? field.help}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Fields grouped by kind, in schema order. A multi-checkbox group (TikTok interactions
 * vs disclosures) gets a small label and lays out in two columns so it doesn't run as a
 * long single column; other groups render as a plain stack.
 */
function FieldGroups({
  fields,
  values,
  get,
  set,
}: {
  fields: readonly SocialPostConfigurationField[];
  get: (key: string) => ConfigValue;
  set: (key: string, value: ConfigValue) => void;
  values: Record<string, unknown>;
}) {
  const groups = SOCIAL_POST_CONFIGURATION_GROUP_ORDER.map((group) => ({
    group,
    items: fields.filter((field) => field.group === group),
  })).filter((entry) => entry.items.length);

  return (
    <div className="grid gap-4">
      {groups.map(({ group, items }) => {
        const switchGroup =
          items.length >= 2 && items.every((f) => f.control === "switch");
        return (
          <div key={group} className="grid gap-2">
            {items.length >= 2 ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {SOCIAL_POST_CONFIGURATION_GROUP_LABELS[group]}
              </span>
            ) : null}
            <div
              className={cn(
                switchGroup ? "grid grid-cols-2 gap-x-4 gap-y-2" : "grid gap-3",
              )}
            >
              {items.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={get(field.key)}
                  values={values}
                  onChange={(next) => set(field.key, next)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** An inline "Advanced options" disclosure — expands in place within a panel. */
function AdvancedSection({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")}
          aria-hidden />
        Advanced options
      </button>
      {open ? <div className="grid gap-4 pt-1">{children}</div> : null}
    </div>
  );
}

/**
 * A platform's field set, split so a panel leads with only what the platform REQUIRES
 * (always visible) and tucks everything else — optional fields and anything already
 * carrying a default — into an inline "Advanced options" disclosure.
 */
function ConfigFields({
  fields,
  values,
  get,
  set,
}: {
  fields: readonly SocialPostConfigurationField[];
  get: (key: string) => ConfigValue;
  set: (key: string, value: ConfigValue) => void;
  values: Record<string, unknown>;
}) {
  const required = fields.filter((field) => field.required);
  const advanced = fields.filter((field) => !field.required);
  const caption = get("caption");
  // A per-layer "Customize caption" toggle that seeds the override. Local so the field can be
  // shown with an empty value (which clears the key) without the switch flipping back off.
  const [captionOn, setCaptionOn] = useState(() => hasValue(caption));
  const toggleCaption = (on: boolean) => {
    setCaptionOn(on);
    if (!on) set("caption", undefined);
  };

  return (
    <div className="grid gap-4">
      {/* Caption override lives at the TOP of every layer, gated by its own switch. */}
      <div className="grid gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={captionOn} onCheckedChange={toggleCaption} />
          Customize caption
        </label>
        {captionOn ? (
          <Textarea
            rows={2}
            placeholder="Override the shared caption for this destination."
            value={typeof caption === "string" ? caption : ""}
            onChange={(event) => set("caption", event.target.value)}
          />
        ) : null}
      </div>

      {required.length ? (
        <FieldGroups fields={required} values={values} get={get} set={set} />
      ) : null}
      {advanced.length ? (
        <AdvancedSection>
          <FieldGroups fields={advanced} values={values} get={get} set={set} />
        </AdvancedSection>
      ) : null}
    </div>
  );
}

/** The current values of a field set — for evaluating disabledWhen / validity. */
function valuesOf(
  fields: readonly SocialPostConfigurationField[],
  get: (key: string) => ConfigValue,
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field.key, get(field.key)]));
}

/** True when every required, currently-visible field is satisfied for EVERY account of the
 * platform — resolved per account by its EFFECTIVE value (account override ▸ platform ▸ default),
 * so a required option set at EITHER the platform OR the account tier counts as ready. */
function isPlatformValid(
  config: ReturnType<typeof useSocialPostConfigurationContext>,
  platform: SocialAccount["platform"],
): boolean {
  return config.accountsForPlatform(platform).every((account) =>
    config
      .visibleFieldsForAccount(account.id)
      .filter((field) => field.required)
      .every((field) => hasValue(config.getAccountValue(account.id, field.key))),
  );
}

/** One platform as an accordion item: a validity dot in the header, options in the panel. */
function PlatformItem({
  platform,
  label,
  accounts,
}: {
  accounts: SocialAccount[];
  label: string;
  platform: SocialAccount["platform"];
}) {
  const config = useSocialPostConfigurationContext();

  const fields = config.visibleFieldsForPlatform(platform);
  const valid = isPlatformValid(config, platform);
  const platformValues = valuesOf(fields, (key) =>
    config.getPlatformValue(platform, key),
  );

  return (
    <AccordionItem value={platform}>
      <AccordionTrigger className="items-center px-3 text-sm">
        <span className="flex items-center gap-2">
          <StatusIndicator
            status={valid ? "success" : "warning"}
            aria-label={valid ? "Ready" : "Needs a required option"}
          />
          <PlatformAvatar platform={platform} size="sm" />
          {label}
        </span>
      </AccordionTrigger>
      {/* Aligns the panel content under the platform avatar in the header. The
          panel primitive already adds `px-2`, so `ps-6` on top of that lands the
          content just past the status dot + gap. */}
      <AccordionContent className="grid gap-4 ps-6 pe-3">
        <ConfigFields
          fields={fields}
          values={platformValues}
          get={(key) => config.getPlatformValue(platform, key)}
          set={(key, value) => config.setPlatformField(platform, key, value)}
        />

        {accounts.length ? (
          <div className="grid gap-2 border-t pt-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Customize per account
            </span>
            {accounts.map((account, index) => {
              const overridden = config.isAccountOverridden(account.id);
              const accountVisible = config.visibleFieldsForAccount(account.id);
              const accountValues = valuesOf(accountVisible, (key) =>
                config.getAccountValue(account.id, key),
              );
              return (
                // Extra top padding sets each account apart from the one above
                // (the first sits flush under the heading) — whitespace alone, no
                // divider rule.
                <div
                  key={account.id}
                  className={cn("grid gap-2", index > 0 && "pt-3")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <UserAvatar
                        name={account.displayName ?? account.username}
                        src={account.avatarUrl}
                        size="sm"
                      />
                      <span className="grid min-w-0 leading-tight">
                        <span className="truncate text-sm">
                          {account.displayName ?? `@${account.username}`}
                        </span>
                        {account.displayName ? (
                          <span className="truncate text-xs text-muted-foreground">
                            @{account.username}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={overridden ? "secondary" : "outline"}
                      onClick={() =>
                        overridden
                          ? config.clearAccountOverride(account.id)
                          : config.overrideAccount(account.id)
                      }
                    >
                      {overridden ? "Reset" : "Customize"}
                    </Button>
                  </div>
                  {overridden ? (
                    // `ms-3` sits the left rule at the CENTER of the sm (size-6 = 24px)
                    // account avatar; `ps-5` lands the override content under the
                    // username (avatar + gap-2).
                    <div className="ms-3 border-s ps-5">
                      <ConfigFields
                        fields={accountVisible}
                        values={accountValues}
                        get={(key) => config.getAccountValue(account.id, key)}
                        set={(key, value) =>
                          config.setAccountField(account.id, key, value)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}

/** The accordion body — reads the shared configuration from context. */
function SocialPostConfigurationBody() {
  const config = useSocialPostConfigurationContext();

  if (!config.groups.length) {
    return (
      <p className="rounded-md border p-3 text-sm text-muted-foreground">
        Select an account to configure its platform.
      </p>
    );
  }

  // Open the platforms that still need a required value, so problems are visible.
  const needsAttention = config.groups
    .filter((group) => !isPlatformValid(config, group.platform))
    .map((group) => group.platform);

  return (
    <Accordion defaultValue={needsAttention}>
      {config.groups.map((group) => (
        <PlatformItem
          key={group.platform}
          platform={group.platform}
          label={group.label}
          accounts={group.accounts}
        />
      ))}
    </Accordion>
  );
}

/**
 * Per-platform post configuration as an accordion: one item per targeted platform, a
 * validity dot in each header (green when its required options are set, amber when not),
 * required options always visible, advanced ones tucked behind an inline "Advanced"
 * toggle, and a per-account override drill-in. Runs {@link useSocialPostConfiguration}
 * internally and shares it via context — controlled with `value`/`onValueChange` or
 * uncontrolled with `defaultValue`. The value it maintains is the create-post body.
 */
export function SocialPostConfiguration({
  accounts,
  value,
  defaultValue,
  onValueChange,
}: {
  accounts: SocialAccount[];
  defaultValue?: SocialPostConfigurationValue;
  onValueChange?: (value: SocialPostConfigurationValue) => void;
  value?: SocialPostConfigurationValue;
}) {
  return (
    <SocialPostConfigurationProvider
      accounts={accounts}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    >
      <SocialPostConfigurationBody />
    </SocialPostConfigurationProvider>
  );
}
