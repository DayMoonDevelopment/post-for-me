import { useState, useEffect } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSubmit } from "react-router";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";
import { Button } from "~/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "~/ui/form";
import { Input } from "~/ui/input";
import { Textarea } from "~/ui/textarea";
import { ProviderIcon } from "./_provider-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select";
import { MultiSelect } from "~/ui/multi-select";

export type FieldType =
  | "text"
  | "password"
  | "email"
  | "url"
  | "textarea"
  | "select"
  | "multiselect";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder: string;
  description?: string;
  required?: boolean;
  rows?: number;
  options?: { name: string; value: string; selected?: boolean }[];
}

export interface SocialProviderConfig {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
}

interface SocialAuthFormProps {
  provider: SocialProviderConfig | null;
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function SocialAuthForm({
  provider,
  open,
  onClose,
  onBack,
}: SocialAuthFormProps) {
  const submit = useSubmit();
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically create Zod schema based on provider fields
  const createFormSchema = (fields: FormField[]) => {
    const schema: Record<string, z.ZodType> = {};
    fields.forEach((field) => {
      if (field.type === "multiselect") {
        let fieldSchema = z.array(z.string());
        if (field.required !== false) {
          fieldSchema = fieldSchema.min(1, "Select at least one option");
        }
        schema[field.name] = fieldSchema;
      } else {
        let fieldSchema = z.string();
        if (field.required !== false) {
          fieldSchema = fieldSchema.min(1, "This field is required");
        }
        if (field.type === "email") {
          fieldSchema = fieldSchema.email("Invalid email address");
        }
        if (field.type === "url") {
          fieldSchema = fieldSchema.url("Invalid URL");
        }
        schema[field.name] = fieldSchema;
      }
    });
    return z.object(schema);
  };

  const form = useForm({
    resolver: provider
      ? zodResolver(createFormSchema(provider.fields))
      : undefined,
    defaultValues: provider?.fields.reduce(
      (acc, field) => {
        if (field.type === "select") {
          // For select fields, use the selected option or the first option as default
          const selectedOption = field.options?.find(
            (option) => option.selected
          );
          const defaultOption = selectedOption || field.options?.[0];
          acc[field.name] = defaultOption?.value || "";
        } else if (field.type === "multiselect") {
          // For multiselect fields, get all selected options
          const selectedOptions = field.options?.filter(
            (option) => option.selected
          );
          acc[field.name] = selectedOptions?.map((opt) => opt.value) || [];
        } else {
          acc[field.name] = "";
        }
        return acc;
      },
      {} as Record<string, string | string[]>
    ),
  });

  useEffect(() => {
    if (provider) {
      // Reset form with proper default values
      const defaultValues = provider.fields.reduce(
        (acc, field) => {
          if (field.type === "select") {
            const selectedOption = field.options?.find(
              (option) => option.selected
            );
            const defaultOption = selectedOption || field.options?.[0];
            acc[field.name] = defaultOption?.value || "";
          } else if (field.type === "multiselect") {
            const selectedOptions = field.options?.filter(
              (option) => option.selected
            );
            acc[field.name] = selectedOptions?.map((opt) => opt.value) || [];
          } else {
            acc[field.name] = "";
          }
          return acc;
        },
        {} as Record<string, string | string[]>
      );
      form.reset(defaultValues);
      setShowPasswords({});
      setIsSubmitting(false);
    }
  }, [provider, form]);

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const onSubmit = (data: Record<string, string | string[]>) => {
    // Set submitting state
    setIsSubmitting(true);

    // Create FormData for submission
    const formData = new FormData();
    formData.append("provider", provider?.id || "");

    // Add all form fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // For arrays (multiselect), append as JSON string
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    // Submit using React Router's submit function
    submit(formData, { method: "POST" });
  };
  const renderField = (field: FormField) => {
    const isPassword = field.type === "password";
    const showPassword = showPasswords[field.name];

    return (
      <FormField
        key={field.name}
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required !== false ? (
                <span className="text-destructive">*</span>
              ) : null}
            </FormLabel>
            <div className="relative">
              <FormControl>
                {field.type === "textarea" ? (
                  <Textarea
                    {...formField}
                    placeholder={field.placeholder}
                    rows={field.rows || 3}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={formField.value}
                    onValueChange={formField.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "multiselect" ? (
                  <MultiSelect
                    options={
                      field.options?.map((option) => ({
                        label: option.name,
                        value: option.value,
                      })) || []
                    }
                    selected={formField.value as string[]}
                    onChange={formField.onChange}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <Input
                    {...formField}
                    type={isPassword && !showPassword ? "password" : "text"}
                    placeholder={field.placeholder}
                  />
                )}
              </FormControl>
              {isPassword ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility(field.name)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
            </div>
            {field.description ? (
              <FormDescription
                dangerouslySetInnerHTML={{ __html: field.description }}
              />
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  if (!provider) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ProviderIcon provider={provider.id} className="w-5 h-5" />
            <DialogTitle>Connect a {provider.name} Account</DialogTitle>
          </div>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" name="provider" value={provider.id} />
            {provider.fields.map(renderField)}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="flex-1"
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!form.formState.isValid || isSubmitting}
              >
                {isSubmitting ? "Connecting..." : `Connect ${provider.name}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
