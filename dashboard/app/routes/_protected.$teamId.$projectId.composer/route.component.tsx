import { Outlet } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaperPlaneIcon } from "icons";

import { useForm as useFormFetcher } from "~/hooks/use-form";

import { cleanPayload } from "./utils";

import { Form, FormControl, FormField, FormItem, FormLabel } from "~/ui/form";
import { Textarea } from "~/ui/textarea";
import { Button } from "~/ui/button";

import { formSchema } from "./schema";
import { Media } from "./_media";
import { Tabs } from "./_tabs";

import { PayloadPreview } from "./_payload-preview";
import { PostPreview } from "./_post-preview";

import type { FormSchema } from "./schema";
import { Accounts } from "./_accounts";

export function Component() {
  const { isSubmitting, fetcher } = useFormFetcher();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      caption: "",
      media: [],
      platform_configurations: {
        tiktok: {
          allow_comments: false,
          allow_duet: false,
          allow_stitch: false,
        },
        pinterest: {
          link: "",
          board_ids: [],
        },
        youtube: {
          title: "",
          privacy_status: "public",
        },
      },
      _disclose_content: false,
    },
  });

  function handleSubmit(values: FormSchema) {
    const payload = cleanPayload(values);

    fetcher.submit(payload, {
      method: "post",
      encType: "application/json",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="relative grid grid-cols-1 @4xl/main:grid-cols-2 @5xl/main:grid-cols-3 gap-8">
          {/* Mobile Sticky Actions Header */}
          <div className="@4xl:hidden sticky top-0 z-10 bg-background py-3 border-b border-border">
            <div className="flex flex-col justify-between gap-2">
              <div className="flex flex-row justify-between gap-2">
                <h1 className="text-base font-semibold">Posting Playground</h1>
                <Button
                  disabled={isSubmitting || !form.formState.isValid}
                  loading={isSubmitting}
                  type="submit"
                  size="sm"
                >
                  <PaperPlaneIcon />
                  Post
                </Button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <PostPreview />
                <PayloadPreview />
              </div>
            </div>
          </div>

          {/* Mobile: Paragraph Under Sticky Header */}
          <div className="@4xl:hidden py-3">
            <p className="text-sm text-muted-foreground">
              Confirm your project is set up correctly by posting to a test
              account. You can mark any account as a test account from the
              <strong> &quot;Social Media Accounts&quot; </strong> table.
            </p>
          </div>

          {/* Desktop Header with Actions and Paragraph */}
          <div className="hidden @4xl:flex col-span-full flex-row items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold">Posting Playground</h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Confirm your project is set up correctly by posting to a test
                account. You can mark any account as a test account from the
                <strong> &quot;Social Media Accounts &quot; </strong> table.
              </p>
            </div>

            <div className="flex flex-row items-center gap-2">
              <PostPreview />
              <PayloadPreview />

              <Button
                disabled={isSubmitting || !form.formState.isValid}
                loading={isSubmitting}
                type="submit"
              >
                <PaperPlaneIcon />
                Post Now
              </Button>
            </div>
          </div>
          <div className="col-span-1 flex flex-col gap-8">
            <Accounts />

            <Media />

            <FormField
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption/Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a caption for your post"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="@5xl/main:col-span-2 space-y-6">
            <Tabs />
          </div>

          {isSubmitting ? (
            <div className="absolute inset-0 bg-background/50" />
          ) : null}
        </div>
      </form>

      <Outlet />
    </Form>
  );
}
