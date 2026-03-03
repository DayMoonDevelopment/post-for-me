import { z } from "zod";

const mediaSchema = z.object({
  url: z.string(),
  name: z.string().optional(),
  id: z.string().optional(),
  preview: z.string().optional(),
});

export const formSchema = z
  .object({
    social_accounts: z.array(z.string()).min(1),
    caption: z.string().min(1),
    media: z.array(mediaSchema),
    platform_configurations: z
      .object({
        tiktok: z
          .object({
            title: z.string().optional(),
            privacy_status: z.enum(["public", "private"]).optional(),
            disclose_your_brand: z.boolean().optional(),
            disclose_branded_content: z.boolean().optional(),
            allow_comments: z.boolean().optional(),
            allow_duet: z.boolean().optional(),
            allow_stitch: z.boolean().optional(),
          })
          .optional(),
        pinterest: z
          .object({
            link: z.string().url("Invalid URL").optional().or(z.literal("")),
            board_ids: z.array(z.string()).optional(),
          })
          .optional(),
        youtube: z
          .object({
            title: z.string().optional(),
            privacy_status: z.enum(["public", "private", "unlisted"]).optional(),
          })
          .optional(),
      })
      .optional(),
    _disclose_content: z.boolean(),
    _providers: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      // If _disclose_content is true, then either _disclose_your_brand or _disclose_branded_content must be true
      if (data._disclose_content === true) {
        return (
          data.platform_configurations?.tiktok?.disclose_your_brand === true ||
          data.platform_configurations?.tiktok?.disclose_branded_content ===
            true
        );
      }

      if (
        data._providers?.includes("tiktok") &&
        !data.platform_configurations?.tiktok?.privacy_status
      ) {
        return false;
      }

      // If _disclose_content is false, no additional requirements
      return true;
    },
    {
      message:
        "When disclosure is required, you must specify either your brand disclosure or branded content disclosure",
      path: ["_disclose_content"], // This will attach the error to the _disclose_content field
    }
  );

export type FormSchema = z.infer<typeof formSchema>;
export type MediaSchema = z.infer<typeof mediaSchema>;
