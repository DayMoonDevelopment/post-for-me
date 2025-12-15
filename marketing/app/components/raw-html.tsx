import { cn } from "~/lib/utils";

export function RawHtml({ html }: { html: string }) {
  return (
    <div
      className={cn(
        "prose prose-gray max-w-none",
        // Base text styling
        "text-base leading-7",

        // Headings - following shadcn/ui typography patterns
        "[&_h1]:scroll-m-20 [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-balance [&_h1]:mb-8 [&_h1]:mt-10 [&_h1:first-child]:mt-0",
        "[&_h2]:mt-10 [&_h2]:scroll-m-20 [&_h2]:pb-2 [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:transition-colors [&_h2:first-child]:mt-0",
        "[&_h3]:mt-8 [&_h3]:scroll-m-20 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3:first-child]:mt-0",
        "[&_h4]:mt-8 [&_h4]:scroll-m-20 [&_h4]:text-xl [&_h4]:font-semibold [&_h4]:tracking-tight [&_h4:first-child]:mt-0",
        "[&_h5]:mt-8 [&_h5]:scroll-m-20 [&_h5]:text-lg [&_h5]:font-semibold [&_h5]:tracking-tight [&_h5:first-child]:mt-0",
        "[&_h6]:mt-8 [&_h6]:scroll-m-20 [&_h6]:text-base [&_h6]:font-semibold [&_h6]:tracking-tight [&_h6:first-child]:mt-0",

        // Paragraphs
        "[&_p]:leading-7 [&_p:not(:first-child)]:mt-6",

        // Large text (if you have lead paragraphs)
        "[&_.lead]:text-xl [&_.lead]:text-muted-foreground",

        // Lists
        "[&_ul]:my-6 [&_ul]:ml-6 [&_ul]:list-disc [&_ul_[data-type=taskList]]:list-none [&_ul:first-child]:mt-0",
        "[&_ol]:my-6 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol:first-child]:mt-0",
        "[&_li]:mt-2",

        // Blockquotes
        "[&_blockquote]:mt-6 [&_blockquote]:border-l-2 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote:first-child]:mt-0",

        // Tables
        "[&_table]:w-full [&_table]:my-6 [&_table:first-child]:mt-0",
        "[&_thead]:border-b",
        "[&_tbody_tr]:border-b [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/50 [&_tbody_tr[data-state=selected]]:bg-muted",
        "[&_th]:border [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground [&_th:first-child]:text-left [&_th:last-child]:text-right",
        "[&_td]:border [&_td]:px-4 [&_td]:py-2 [&_td:first-child]:text-left [&_td:last-child]:text-right",

        // Links
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary/80",

        // Code
        "[&_code]:relative [&_code]:rounded [&_code]:bg-muted [&_code]:px-[0.3rem] [&_code]:py-[0.2rem] [&_code]:font-mono [&_code]:text-sm [&_code]:font-semibold",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_pre:first-child]:mt-0",

        // Images
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:border",

        // Horizontal rules
        "[&_hr]:my-4 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-border [&_hr:first-child]:mt-0",

        // Small text
        "[&_small]:text-sm [&_small]:font-medium [&_small]:leading-none",

        // Muted text
        "[&_.muted]:text-sm [&_.muted]:text-muted-foreground",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
