import { useCallback, useState } from "react";
import { Link, useLoaderData } from "react-router";

import { cn } from "~/lib/utils";

import {
  ArrowCornerDownRightIcon,
  CheckmarkSmallIcon,
  CopyIcon,
  CircleFilledIcon,
} from "~/components/icons";
import { BrandIcon } from "~/components/brand-icon";

import { Avatar, AvatarFallback, AvatarImage } from "~/ui/avatar";
import { Button } from "~/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/table";

import type { LoaderData, PostResult } from "./types";

export function PostContentProcessed() {
  const { results } = useLoaderData<LoaderData>();

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  return (
    <div className="space-y-3">
      <div className="flex flex-row items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {results.length} {results.length === 1 ? "result" : "results"}
        </span>
        {succeeded > 0 ? (
          <span className="flex items-center gap-1.5 text-affirmative">
            <CircleFilledIcon className="size-2" />
            {succeeded} succeeded
          </span>
        ) : null}
        {failed > 0 ? (
          <span className="flex items-center gap-1.5 text-destructive">
            <CircleFilledIcon className="size-2" />
            {failed} failed
          </span>
        ) : null}
      </div>

      <div className="w-full overflow-hidden rounded-lg border">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[22%]">Account</TableHead>
              <TableHead className="w-22">Status</TableHead>
              <TableHead>Result ID</TableHead>
              <TableHead>Account ID</TableHead>
              <TableHead>Platform post ID</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <ResultRow key={result.id} result={result} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: PostResult }) {
  const provider = result.account?.provider?.split("_")[0] ?? "";
  const handle =
    result.account?.username ??
    result.platform_data?.username ??
    result.social_account_id;

  const showError = !result.success && Boolean(result.error);

  return (
    <>
      <TableRow className={cn(showError && "border-0")}>
        <TableCell>
          <div className="flex min-w-0 flex-row items-center gap-2">
            <div className="relative shrink-0">
              <Avatar className="size-6">
                <AvatarImage src={result.account?.profile_photo_url || ""} />
                <AvatarFallback>
                  <BrandIcon brand={provider} className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              {provider ? (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                  <BrandIcon brand={provider} className="size-2.5" />
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{handle}</span>
              <span className="truncate text-xs capitalize text-muted-foreground">
                {result.account?.provider ?? "unknown account"}
              </span>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <span
            title={!result.success && result.error ? result.error : undefined}
            className={cn(
              "text-sm",
              result.success ? "text-affirmative" : "text-destructive",
            )}
          >
            {result.success ? "Posted" : "Failed"}
          </span>
        </TableCell>

        <TableCell>
          <CopyCell value={result.id} />
        </TableCell>
        <TableCell>
          <CopyCell value={result.social_account_id} />
        </TableCell>
        <TableCell>
          <CopyCell value={result.platform_data?.id} />
        </TableCell>
        <TableCell>
          <CopyCell
            value={result.platform_data?.url}
            href={result.platform_data?.url}
          />
        </TableCell>

        <TableCell>
          <RawDataDialog result={result} />
        </TableCell>
      </TableRow>

      {showError ? (
        <TableRow className="border-destructive/8 bg-destructive/5 hover:bg-destructive/5">
          <TableCell colSpan={7} className="py-2">
            <div className="flex flex-row items-start gap-2 text-sm text-destructive pl-2">
              <ArrowCornerDownRightIcon className="size-4 shrink-0 text-destructive" />
              <span className="wrap-break-word">{result.error}</span>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function CopyCell({
  value,
  href,
}: {
  value: string | null | undefined;
  href?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [value]);

  if (!value) {
    return <span className="text-sm text-foreground/25">—</span>;
  }

  return (
    <div className="flex min-w-0 flex-row items-center gap-1.5">
      {href ? (
        <Link
          to={href}
          target="_blank"
          rel="noopener noreferrer"
          title={value}
          className="truncate font-mono text-xs text-primary hover:underline"
        >
          {value}
        </Link>
      ) : (
        <span title={value} className="truncate font-mono text-xs">
          {value}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <CheckmarkSmallIcon className="size-3 text-affirmative" />
        ) : (
          <CopyIcon className="size-3" />
        )}
      </button>
    </div>
  );
}

function RawDataDialog({ result }: { result: PostResult }) {
  const [copied, setCopied] = useState(false);

  const provider = result.account?.provider?.split("_")[0] ?? "";
  const handle = result.account?.username ?? result.social_account_id;

  const json =
    result.details != null
      ? JSON.stringify(result.details, null, 2)
      : "No response details available.";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [json]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          View Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex flex-row items-center gap-2">
            <BrandIcon brand={provider} className="size-4" />
            {handle}
            <span
              className={cn(
                "text-xs font-normal",
                result.success ? "text-affirmative" : "text-destructive",
              )}
            >
              {result.success ? "Posted" : "Failed"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {!result.success && result.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {result.error}
          </div>
        ) : null}

        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="absolute right-2 top-2 z-10"
          >
            {copied ? (
              <CheckmarkSmallIcon className="size-3 text-affirmative" />
            ) : (
              <CopyIcon className="size-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 pr-20 text-xs leading-relaxed">
            {json}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
