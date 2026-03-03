import { cn } from "~/lib/utils";
import { ProviderIcon } from "./_provider-icon";
import { useLoaderData } from "react-router";
import { getProvidersRequiringAuth } from "./_provider-configs";
import type { Route } from "./+types/route";

interface ProviderGridProps {
  onProviderSelect?: (providerId: string) => void;
}

export function ProviderGrid({ onProviderSelect }: ProviderGridProps) {
  const { providers } = useLoaderData<Route.ComponentProps["loaderData"]>();
  const providersRequiringAuth = getProvidersRequiringAuth();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          providerId={provider.id}
          enabled={provider.enabled}
          name={provider.name}
          requiresCustomAuth={providersRequiringAuth.includes(provider.id)}
          onSelect={onProviderSelect}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  providerId,
  enabled,
  name,
  requiresCustomAuth,
  onSelect,
}: {
  providerId: string;
  enabled: boolean;
  name: string;
  requiresCustomAuth: boolean;
  onSelect?: (providerId: string) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (!enabled) return;

    if (requiresCustomAuth && onSelect) {
      e.preventDefault(); // Prevent form submission
      onSelect(providerId);
    }
    // For providers that don't require custom auth, let the form submit normally
  };

  return (
    <button
      type={requiresCustomAuth ? "button" : "submit"}
      name={!requiresCustomAuth ? "provider" : undefined}
      value={!requiresCustomAuth ? providerId : undefined}
      disabled={!enabled}
      onClick={handleClick}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 min-h-[220px] rounded-lg border-2 border-dashed transition-all duration-200 text-muted-foreground border-muted-foreground-10 [&:not(:disabled)]:hover:border-accent [&:not(:disabled)]:hover:border-solid [&:not(:disabled)]:hover:text-foreground [&:not(:disabled)]:hover:cursor-pointer disabled:bg-muted disabled:border-none disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <ProviderIcon
        provider={providerId.split("-")[0]}
        className="h-[100px] w-[100px] mb-3"
      />
      <span className="text-sm font-medium text-center leading-tight">
        {name}
      </span>
      {!enabled ? (
        <span className="italic text-xs text-muted-foreground absolute bottom-3">
          Setup Required
        </span>
      ) : null}
    </button>
  );
}
