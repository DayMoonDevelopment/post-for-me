"use client";

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { SocialAccount, SocialProvider } from "~/lib/post-for-me.types";
import { PLATFORM_LABELS, PLATFORM_ORDER } from "~/lib/post-for-me.utils";
import {
  getVisibleFields,
  SOCIAL_POST_CONFIGURATION_SCHEMA,
  type SocialPostConfigurationField,
} from "~/lib/social-post-configuration.schema";
import type {
  AccountConfiguration,
  PlatformConfiguration,
  SocialPostConfiguration,
} from "~/lib/social-post-configuration.types";

/** A single configuration value a control reads/writes. */
type ConfigValue = string | number | boolean | string[] | undefined;
type ConfigBag = Record<string, unknown>;

/** One platform's slice of the connected accounts. */
export type SocialPostConfigurationPlatformGroup = {
  platform: SocialProvider;
  label: string;
  accounts: SocialAccount[];
};

export interface UseSocialPostConfigurationOptions {
  /** Connected accounts the post targets — drives which platforms are shown. */
  accounts: SocialAccount[];
  /** Controlled value (the API-shaped configuration). */
  value?: SocialPostConfiguration;
  /** Initial value when uncontrolled. */
  defaultValue?: SocialPostConfiguration;
  onValueChange?: (value: SocialPostConfiguration) => void;
}

/** True for values that should clear a key rather than store it. */
function isEmpty(value: ConfigValue): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Headless state for a social post's per-platform configuration. Owns the
 * `SocialPostConfiguration` value (controlled via `value`/`onValueChange` or
 * uncontrolled via `defaultValue`) and resolves each target's effective values by
 * layering account overrides over the platform config over the field defaults — the
 * same precedence the API applies at publish time.
 *
 * It is renderer-agnostic and free of any validation dependency: pair it with the
 * declarative schema to draw fields (any layout — accordion, tabs, drawer) and,
 * optionally, with the validation item to check the value before submit.
 *
 * The model is platform-first: you configure a platform once for all its accounts, and
 * drill into a single account only when it needs to differ (`overrideAccount`).
 */
export function useSocialPostConfiguration({
  accounts,
  value,
  defaultValue = {},
  onValueChange,
}: UseSocialPostConfigurationOptions) {
  const [uncontrolled, setUncontrolled] =
    useState<SocialPostConfiguration>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : uncontrolled;

  const setValue = (next: SocialPostConfiguration) => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  // Platforms present among the accounts, in a stable display order.
  const groups = useMemo<SocialPostConfigurationPlatformGroup[]>(() => {
    const byPlatform = new Map<SocialProvider, SocialAccount[]>();
    for (const account of accounts) {
      const list = byPlatform.get(account.platform) ?? [];
      list.push(account);
      byPlatform.set(account.platform, list);
    }
    return PLATFORM_ORDER.filter((p) => byPlatform.get(p)?.length).map(
      (platform) => ({
        platform,
        label: PLATFORM_LABELS[platform],
        accounts: byPlatform.get(platform)!,
      }),
    );
  }, [accounts]);

  const platforms = useMemo(() => groups.map((g) => g.platform), [groups]);

  // Field defaults per platform, computed once from the schema.
  const defaultsByPlatform = useMemo(() => {
    const map = {} as Record<SocialProvider, ConfigBag>;
    for (const platform of PLATFORM_ORDER) {
      const defaults: ConfigBag = {};
      for (const field of SOCIAL_POST_CONFIGURATION_SCHEMA[platform]) {
        if (field.default !== undefined) defaults[field.key] = field.default;
      }
      map[platform] = defaults;
    }
    return map;
  }, []);

  const platformOf = (accountId: string): SocialProvider | undefined =>
    accounts.find((a) => a.id === accountId)?.platform;

  const storedPlatform = (platform: SocialProvider): ConfigBag =>
    (current.platform_configurations?.[platform] as ConfigBag) ?? {};

  const storedAccount = (accountId: string): ConfigBag | undefined =>
    current.account_configurations?.find(
      (e) => e.social_account_id === accountId,
    )?.configuration as ConfigBag | undefined;

  /** Platform values with defaults applied — what a control should display. */
  const effectivePlatform = (platform: SocialProvider): ConfigBag => ({
    ...defaultsByPlatform[platform],
    ...storedPlatform(platform),
  });

  /** Account values: defaults ▸ platform ▸ account override, key by key. */
  const effectiveAccount = (accountId: string): ConfigBag => {
    const platform = platformOf(accountId);
    if (!platform) return {};
    return {
      ...effectivePlatform(platform),
      ...(storedAccount(accountId) ?? {}),
    };
  };

  // --- platform tier -------------------------------------------------------

  const setPlatformField = (
    platform: SocialProvider,
    key: string,
    next: ConfigValue,
  ) => {
    const configs: Record<string, PlatformConfiguration> = {
      ...(current.platform_configurations as
        | Record<string, PlatformConfiguration>
        | undefined),
    };
    const config = { ...((configs[platform] as ConfigBag) ?? {}) };
    if (isEmpty(next)) delete config[key];
    else config[key] = next;
    configs[platform] = config as PlatformConfiguration;
    setValue({
      ...current,
      platform_configurations:
        configs as SocialPostConfiguration["platform_configurations"],
    });
  };

  const resetPlatform = (platform: SocialProvider) => {
    const configs: Record<string, PlatformConfiguration> = {
      ...(current.platform_configurations as
        | Record<string, PlatformConfiguration>
        | undefined),
    };
    delete configs[platform];
    setValue({
      ...current,
      platform_configurations:
        configs as SocialPostConfiguration["platform_configurations"],
    });
  };

  const visibleFieldsForPlatform = (
    platform: SocialProvider,
  ): readonly SocialPostConfigurationField[] =>
    getVisibleFields(platform, effectivePlatform(platform));

  // --- account tier (drill-in overrides) -----------------------------------

  const isAccountOverridden = (accountId: string): boolean =>
    (current.account_configurations ?? []).some(
      (e) => e.social_account_id === accountId,
    );

  /** Start customizing one account — seeds an empty override that inherits the platform. */
  const overrideAccount = (accountId: string) => {
    if (isAccountOverridden(accountId)) return;
    const list = [...(current.account_configurations ?? [])];
    list.push({ social_account_id: accountId, configuration: {} });
    setValue({ ...current, account_configurations: list });
  };

  const clearAccountOverride = (accountId: string) => {
    const list = (current.account_configurations ?? []).filter(
      (e) => e.social_account_id !== accountId,
    );
    setValue({ ...current, account_configurations: list });
  };

  const setAccountField = (
    accountId: string,
    key: string,
    next: ConfigValue,
  ) => {
    const list = [...(current.account_configurations ?? [])];
    const index = list.findIndex((e) => e.social_account_id === accountId);
    const config = {
      ...((index >= 0 ? list[index].configuration : {}) as ConfigBag),
    };
    if (isEmpty(next)) delete config[key];
    else config[key] = next;
    const entry: AccountConfiguration = {
      social_account_id: accountId,
      configuration: config as AccountConfiguration["configuration"],
    };
    if (index >= 0) list[index] = entry;
    else list.push(entry);
    setValue({ ...current, account_configurations: list });
  };

  const visibleFieldsForAccount = (
    accountId: string,
  ): readonly SocialPostConfigurationField[] => {
    const platform = platformOf(accountId);
    if (!platform) return [];
    return getVisibleFields(platform, effectiveAccount(accountId));
  };

  // --- summaries -----------------------------------------------------------

  const summarize = (platform: SocialProvider, config: ConfigBag): string => {
    const parts: string[] = [];
    for (const field of getVisibleFields(platform, config)) {
      if (
        (field.control === "segmented" || field.control === "select") &&
        config[field.key] != null
      ) {
        const option = field.options?.find((o) => o.value === config[field.key]);
        if (option) parts.push(option.label);
      }
    }
    return parts.join(" · ");
  };

  return {
    /** The current configuration value — hand straight to the API. */
    value: current,
    /** Platforms present among the accounts, ordered, each with its accounts. */
    groups,
    platforms,
    accountsForPlatform: (platform: SocialProvider) =>
      groups.find((g) => g.platform === platform)?.accounts ?? [],
    platformOf,

    // platform tier
    getPlatformValue: (platform: SocialProvider, key: string) =>
      effectivePlatform(platform)[key] as ConfigValue,
    setPlatformField,
    resetPlatform,
    visibleFieldsForPlatform,
    summaryForPlatform: (platform: SocialProvider) =>
      summarize(platform, effectivePlatform(platform)),

    // account tier
    isAccountOverridden,
    overrideAccount,
    clearAccountOverride,
    getAccountValue: (accountId: string, key: string) =>
      effectiveAccount(accountId)[key] as ConfigValue,
    setAccountField,
    visibleFieldsForAccount,
    summaryForAccount: (accountId: string) => {
      const platform = platformOf(accountId);
      return platform ? summarize(platform, effectiveAccount(accountId)) : "";
    },
  };
}

export type UseSocialPostConfigurationReturn = ReturnType<
  typeof useSocialPostConfiguration
>;

const SocialPostConfigurationContext =
  createContext<UseSocialPostConfigurationReturn | null>(null);

/**
 * Runs {@link useSocialPostConfiguration} once and shares it via context, so a composed
 * experience (an account row, a platform panel, a field control) reads the same
 * configuration state without threading it through props. Controlled/uncontrolled the
 * same way as the hook.
 */
export function SocialPostConfigurationProvider({
  children,
  ...options
}: UseSocialPostConfigurationOptions & { children: ReactNode }) {
  const config = useSocialPostConfiguration(options);
  return createElement(
    SocialPostConfigurationContext.Provider,
    { value: config },
    children,
  );
}

/** Read the configuration state from the nearest {@link SocialPostConfigurationProvider}. */
export function useSocialPostConfigurationContext(): UseSocialPostConfigurationReturn {
  const context = useContext(SocialPostConfigurationContext);
  if (!context) {
    throw new Error(
      "useSocialPostConfigurationContext must be used within a <SocialPostConfigurationProvider>.",
    );
  }
  return context;
}
