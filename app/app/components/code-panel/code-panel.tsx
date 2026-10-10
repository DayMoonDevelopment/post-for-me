import * as React from "react";
import { useTranslation } from "react-i18next";

import { useLocalStorage } from "~/hooks/use-local-storage";
import { CodeBlock } from "~/ui/code-block";
import { LanguageMark } from "~/ui/language-mark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select";

import type { CodeLanguageId, CodeSamples } from "./code-languages";

import { CODE_LANGUAGES, isCodeLanguageId } from "./code-languages";

/**
 * CodePanel — the reusable "here's the code for this action" viewer: a labeled
 * language switcher (brand-marked, {@link ~/ui/code-block CodeBlock}-highlighted)
 * over a set of {@link CodeSamples}. Drop it anywhere the app needs to show the
 * programmatic equivalent of a UI action — the code aside of a {@link
 * ./code-showcase CodeShowcase}, a pull-up sheet next to on-screen UI, an
 * onboarding slide.
 *
 * The switcher spans exactly the languages present in `samples` (in {@link
 * CODE_LANGUAGES} order). The chosen language persists to a SHARED preference
 * (`storageKey`), so a developer who picks Python once sees Python in every panel
 * — falling back to the panel's first available language when their preference
 * isn't offered here.
 *
 * `surface`/`showLineNumbers`/`className`/`headerClassName` pass through to the
 * underlying `CodeBlock` (e.g. `surface={false}` + `className="min-h-0 flex-1"`
 * to fill a distinguished container).
 */
export interface CodePanelProps {
  className?: string;
  /** Copy-control label. Defaults to the shared `codePanel.copy` string. */
  copyLabel?: string;
  /** Extra header classes (e.g. `pe-10` to clear a dialog's close button). */
  headerClassName?: string;
  /** Visible label before the switcher. Defaults to `codePanel.language`. */
  languageLabel?: string;
  /** language id → source code. The switcher covers the languages present. */
  samples: CodeSamples;
  /** Editor-style line-number gutter. Default `true`. */
  showLineNumbers?: boolean;
  /** localStorage key for the shared language preference. */
  storageKey?: string;
  /** Draw CodeBlock's own box. Default `false` — CodePanel usually fills a
   * distinguished container (a muted aside / a sheet). */
  surface?: boolean;
}

/** Shared so the language preference carries across every panel in the app. */
const DEFAULT_STORAGE_KEY = "pfm:code-language";

export function CodePanel({
  samples,
  storageKey = DEFAULT_STORAGE_KEY,
  showLineNumbers = true,
  surface = false,
  languageLabel,
  copyLabel,
  className,
  headerClassName,
}: CodePanelProps) {
  const { t } = useTranslation();

  const available = React.useMemo(
    () => CODE_LANGUAGES.filter((entry) => samples[entry.id] != null),
    [samples],
  );

  const [preferred, setPreferred] = useLocalStorage<CodeLanguageId>(
    storageKey,
    available[0]?.id ?? "typescript",
    isCodeLanguageId,
  );

  if (available.length === 0) return null;

  // The stored preference wins when this panel offers it; otherwise fall back to
  // the first available language WITHOUT overwriting the preference (so a panel
  // that lacks the preferred language doesn't clobber it for panels that have it).
  const active =
    available.find((entry) => entry.id === preferred) ?? available[0];
  const code = samples[active.id] ?? "";

  return (
    <CodeBlock
      language={
        <CodePanelLanguage
          value={active.id}
          onChange={setPreferred}
          options={available}
          label={languageLabel ?? t("codePanel.language")}
        />
      }
      copyLabel={copyLabel ?? t("codePanel.copy")}
      code={code}
      syntax={active.grammar}
      showLineNumbers={showLineNumbers}
      surface={surface}
      className={className}
      headerClassName={headerClassName}
    />
  );
}

/** The labeled language control for the code panel's header: a dropdown across
 * the available languages, or a static mark+label when only one is offered. */
function CodePanelLanguage({
  value,
  onChange,
  options,
  label,
}: {
  label: string;
  onChange: (value: CodeLanguageId) => void;
  options: readonly (typeof CODE_LANGUAGES)[number][];
  value: CodeLanguageId;
}) {
  const labelId = React.useId();
  const active = options.find((entry) => entry.id === value) ?? options[0];

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {options.length <= 1 ? (
        <span className="flex items-center gap-1.5 text-xs/relaxed font-medium">
          <LanguageMark language={active.id} />
          {active.label}
        </span>
      ) : (
        <Select
          value={value}
          onValueChange={(next) => onChange(next as CodeLanguageId)}
        >
          <SelectTrigger
            size="sm"
            aria-labelledby={labelId}
            className="h-7 w-auto gap-1.5"
          >
            {/* Render the brand mark + label, not the raw id. */}
            <SelectValue>
              {(selected) => {
                const entry = options.find((o) => o.id === selected);
                if (!entry) return null;
                return (
                  <>
                    <LanguageMark language={entry.id} />
                    {entry.label}
                  </>
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                <LanguageMark language={entry.id} />
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
