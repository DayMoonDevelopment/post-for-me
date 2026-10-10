import { useTranslation } from "react-i18next";

import { JsonBlock } from "~/ui/json-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/tabs";

import { AskLlmButton } from "./result-logs-ask-llm";
import { parseDetails, toOperations } from "./result-logs-parse";
import { LogRail } from "./result-logs-rail";

/**
 * The result's logs. Default is a linear rail of the provider operations (request
 * + response per step, pretty JSON by default); a Tabs control swaps the whole
 * panel to the full raw JSON. Falls back to raw JSON when the details aren't the
 * request/response shape. For a failed result, pass `askLlm` to surface an
 * "Ask LLM" action at the trailing edge that copies a ready-to-paste prompt.
 */
export function ResultLogs({
  details,
  askLlm,
}: {
  askLlm?: { errorMessage: string | null };
  details: unknown;
}) {
  const { t } = useTranslation();
  const parsed = parseDetails(details);
  const operations = toOperations(parsed);

  const llmPrompt = askLlm
    ? t("socialPostResults.askLlmPrompt", {
        error: askLlm.errorMessage ?? "(no error message)",
        logs: parsed == null ? "(no logs)" : JSON.stringify(parsed, null, 2),
        interpolation: { escapeValue: false },
      })
    : null;

  if (!operations) {
    return (
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold text-foreground">
            {t("socialPostResults.logsTitle")}
          </h2>
          {llmPrompt ? <AskLlmButton prompt={llmPrompt} /> : null}
        </div>
        {parsed == null ? (
          <p className="text-sm text-muted-foreground">
            {t("socialPostResults.logsEmpty")}
          </p>
        ) : (
          <JsonBlock value={parsed} />
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <Tabs defaultValue="logs">
        <div className="flex items-center justify-between gap-3">
          <TabsList variant="line">
            <TabsTrigger value="logs">
              {t("socialPostResults.logsTitle")}
            </TabsTrigger>
            <TabsTrigger value="raw">
              {t("socialPostResults.rawTab")}
            </TabsTrigger>
          </TabsList>
          {llmPrompt ? <AskLlmButton prompt={llmPrompt} /> : null}
        </div>
        <TabsContent value="logs" className="pt-4">
          <LogRail operations={operations} />
        </TabsContent>
        <TabsContent value="raw" className="pt-4">
          <JsonBlock value={parsed} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
