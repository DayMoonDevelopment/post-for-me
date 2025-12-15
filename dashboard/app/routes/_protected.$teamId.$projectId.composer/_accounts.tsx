import * as React from "react";
import { useLoaderData } from "react-router";
import { useFormContext } from "react-hook-form";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/ui/popover";
import { Badge } from "~/ui/badge";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/ui/form";
import { BrandIcon } from "~/components/brand-icon";

import type { FormSchema } from "./schema";
import type { LoaderData } from "./types";

export function Accounts() {
  const { accounts } = useLoaderData<LoaderData>();
  const [open, setOpen] = React.useState(false);
  const form = useFormContext<FormSchema>();

  // Guard against undefined or invalid connections
  const safeConnections = Array.isArray(accounts) ? accounts : [];

  const availableAccounts = safeConnections.map((connection) => ({
    value: connection.id,
    label: connection.username,
    provider: connection.provider,
    username: connection.username,
  }));

  // Helper function to update providers based on selected accounts
  const updateProviders = (selectedAccountIds: string[]) => {
    const selectedProviders = selectedAccountIds
      .map((accountId) => {
        const account = availableAccounts.find(
          (acc) => acc.value === accountId
        );
        return account?.provider;
      })
      .filter(Boolean) as string[];

    form.setValue("_providers", selectedProviders);
  };

  // Show loading state if no connections are available
  if (safeConnections.length === 0) {
    return (
      <FormField
        control={form.control}
        name="social_accounts"
        render={() => (
          <FormItem>
            <FormLabel>Social Accounts</FormLabel>
            <FormControl>
              <Button
                variant="outline"
                disabled
                className="w-full justify-between"
              >
                Mark accounts as Test Accounts
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <>
      <FormField
        control={form.control}
        name="social_accounts"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Social Accounts</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between"
                    >
                      {field.value && field.value.length > 0
                        ? `${field.value.length} account${field.value.length > 1 ? "s" : ""} selected`
                        : "Select social accounts..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                    <Command className="w-full">
                      <CommandInput placeholder="Search accounts..." />
                      <CommandList>
                        <CommandEmpty>No accounts found.</CommandEmpty>
                        <CommandGroup>
                          {availableAccounts.map((account) => (
                            <CommandItem
                              key={account.value}
                              value={account.value}
                              onSelect={() => {
                                const currentValue = field.value || [];
                                const isSelected = currentValue.includes(
                                  account.value
                                );

                                let newValue: string[];
                                if (isSelected) {
                                  // Remove from selection
                                  newValue = currentValue.filter(
                                    (id) => id !== account.value
                                  );
                                } else {
                                  // Add to selection
                                  newValue = [...currentValue, account.value];
                                }

                                field.onChange(newValue);
                                updateProviders(newValue);
                              }}
                            >
                              <div className="flex items-center space-x-2 flex-1">
                                <BrandIcon
                                  brand={account.provider.split("_")[0]}
                                  className="h-4 w-4"
                                />
                                <span className="text-sm">
                                  {account.username}
                                </span>
                              </div>
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  field.value?.includes(account.value)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}{" "}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Selected accounts display */}
                {field.value && field.value.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {field.value.map((accountId) => {
                      const account = availableAccounts.find(
                        (acc) => acc.value === accountId
                      );
                      if (!account) return null;

                      return (
                        <Badge
                          key={accountId}
                          variant="default"
                          className="flex items-center gap-2"
                        >
                          <BrandIcon
                            brand={account.provider.split("_")[0]}
                            className="h-3 w-3"
                          />
                          <span className="text-xs">{account.username}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newValue = (field.value || []).filter(
                                (id) => id !== accountId
                              );
                              field.onChange(newValue);
                              updateProviders(newValue);
                            }}
                            className="hover:bg-muted-foreground/20"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Hidden input for providers */}
      <FormField
        control={form.control}
        name="_providers"
        render={({ field }) => (
          <FormItem className="hidden">
            <FormControl>
              <input
                type="hidden"
                {...field}
                value={Array.isArray(field.value) ? field.value.join(",") : ""}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
}
