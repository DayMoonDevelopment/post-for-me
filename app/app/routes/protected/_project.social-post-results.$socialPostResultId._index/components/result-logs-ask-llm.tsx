import { useTranslation } from "react-i18next";

import { AiAgentIcon, CheckIcon } from "~/icons";
import { Button } from "~/ui/button";
import { useCopyToClipboard } from "~/ui/copyable";

/**
 * Trailing-edge action for a failed result: copies a ready-to-paste prompt (PFM
 * context + the error + logs + doc links) for an LLM, with copy feedback.
 */
export function AskLlmButton({ prompt }: { prompt: string }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyToClipboard();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void copy(prompt)}
    >
      {copied ? <CheckIcon className="text-success" /> : <AiAgentIcon />}
      {copied
        ? t("socialPostResults.askLlmCopied")
        : t("socialPostResults.askLlm")}
      <span aria-live="polite" className="sr-only">
        {copied ? t("socialPostResults.askLlmCopied") : ""}
      </span>
    </Button>
  );
}
