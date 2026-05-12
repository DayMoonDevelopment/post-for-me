import React, { useId, useState } from "react";

import { cva } from "class-variance-authority";

import { cn } from "~/lib/utils";

import { Input } from "~/ui/input";

import { CrossSmallIcon } from "~/components/icons";

import type { InputHTMLAttributes, KeyboardEvent } from "react";

export interface Tag<T = string> {
  id: string;
  text: T;
  variant?: "default" | "destructive";
}

export interface TagInputProps<T = string>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: Tag<T>[];
  onChange: (tags: Tag<T>[]) => void;
  placeholder?: string;
  validator?: (text: T) => boolean;
}

const tagContainerStyles = cva(
  "flex flex-wrap items-center border rounded-md  shadow-xs transition-[color,box-shadow] focus-within:border-ring outline-none focus-within:ring-[3px] focus-within:ring-ring/50 p-1 gap-1",
  {
    variants: {
      disabled: {
        true: "opacity-50 cursor-not-allowed bg-muted",
      },
    },
    defaultVariants: {
      disabled: false,
    },
  },
);

const tagStyles = cva(
  "h-7 relative bg-background border rounded-[0.3rem] font-medium text-xs ps-2 pe-7 flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-background border-input hover:bg-background",
        destructive:
          "bg-destructive/10 border-destructive/50 text-destructive [&_svg]:text-destructive/50",
      },
      active: {
        true: "ring-2 ring-ring/50",
      },
    },
    defaultVariants: {
      active: false,
      variant: "default",
    },
  },
);

export function TagInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  validator,
  ...props
}: TagInputProps<string>) {
  const [inputValue, setInputValue] = useState<string>("");
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  const inputId = useId();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addTag = (text: string) => {
    const trimmedValue = text.trim();

    // Don't add if empty
    if (!trimmedValue) {
      return;
    }

    // Don't add if already exists
    if (value.some((tag) => tag.text === trimmedValue)) {
      setInputValue("");
      return;
    }

    const isValid = validator ? validator(trimmedValue) : true;

    const newTag: Tag<string> = {
      id: crypto.randomUUID(),
      text: trimmedValue,
      variant: isValid ? "default" : "destructive",
    };

    onChange([...value, newTag]);
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      (e.key === "Enter" || e.key === " " || e.key === ",") &&
      inputValue.trim()
    ) {
      e.preventDefault();
      // Remove comma from the input value if it was the trigger
      const valueToAdd =
        e.key === "," ? inputValue.replace(/,+$/, "") : inputValue;
      addTag(valueToAdd);
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      e.preventDefault();
      if (activeTagIndex !== null) {
        const newTags = [...value];
        newTags.splice(activeTagIndex, 1);
        onChange(newTags);
        setActiveTagIndex(null);
      } else {
        setActiveTagIndex(value.length - 1);
      }
    } else if (e.key === "ArrowLeft" && inputValue === "" && value.length > 0) {
      e.preventDefault();
      setActiveTagIndex(
        Math.max(
          0,
          activeTagIndex === null ? value.length - 1 : activeTagIndex - 1,
        ),
      );
    } else if (
      e.key === "ArrowRight" &&
      inputValue === "" &&
      activeTagIndex !== null
    ) {
      e.preventDefault();
      if (activeTagIndex === value.length - 1) {
        setActiveTagIndex(null);
      } else {
        setActiveTagIndex(activeTagIndex + 1);
      }
    } else if (e.key === "Delete" && activeTagIndex !== null) {
      e.preventDefault();
      const newTags = [...value];
      newTags.splice(activeTagIndex, 1);
      onChange(newTags);
      setActiveTagIndex(null);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Add tag on blur if there's input value
    if (inputValue.trim()) {
      addTag(inputValue);
    }

    // Clear active tag selection when input loses focus
    setActiveTagIndex(null);

    // Call original onBlur if provided
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(value.filter((tag) => tag.id !== tagId));
    setActiveTagIndex(null);
  };

  return (
    <div className={cn(tagContainerStyles({ disabled }), className)}>
      <div className="w-full flex flex-wrap items-center gap-1">
        {value.map((tag, index) => (
          <div
            key={tag.id}
            className={tagStyles({
              variant: tag.variant || "default",
              active: activeTagIndex === index,
            })}
            onClick={() => setActiveTagIndex(index)}
          >
            {tag.text}
            {!disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag.id);
                }}
                className="absolute -inset-y-px -end-px p-0 rounded-e-md flex size-7 transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] text-muted-foreground/80 hover:text-foreground hover:cursor-pointer"
                aria-label={`Remove ${tag.text} tag`}
              >
                <CrossSmallIcon className="size-4 m-auto" />
              </button>
            ) : null}
          </div>
        ))}
        <Input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "flex-1 min-w-[80px] shadow-none px-2 h-7 bg-transparent",
            disabled && "cursor-not-allowed",
            "border-0 focus-visible:outline-none focus-visible:ring-0",
          )}
          disabled={disabled}
          {...props}
        />
      </div>
    </div>
  );
}
