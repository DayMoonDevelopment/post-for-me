import { useState } from "react";
import { EyeOpenIcon, EyeClosedIcon } from "icons";
import { Input } from "~/ui/input";
import { FormControl, FormField, FormItem, FormLabel } from "~/ui/form";

interface CredentialInputProps {
  name: string;
  label: string;
  placeholder: string;
  type?: "text" | "password";
}

export function CredentialInput({
  name,
  label,
  placeholder,
  type = "text",
}: CredentialInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible((prev) => !prev);

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                className={`bg-card pr-10`}
                placeholder={placeholder}
                type={type === "password" && !isVisible ? "password" : "text"}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                spellCheck="false"
                {...field}
              />
            </FormControl>

            {type === "password" ? (
              <button
                type="button"
                onClick={toggleVisibility}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={isVisible ? "Hide secret" : "Show secret"}
              >
                {isVisible ? (
                  <EyeClosedIcon className="size-4 cursor-pointer" />
                ) : (
                  <EyeOpenIcon className="size-4 cursor-pointer" />
                )}
              </button>
            ) : null}
          </div>
        </FormItem>
      )}
    />
  );
}
