import type { Highlighter } from "shiki";

// The languages + dual (light/dark) themes the showcase needs. github-* tracks
// the app's light/dark via CSS vars (see the .shiki rules in app.css).
const LANGS = ["tsx", "json", "bash"];
const THEMES = { light: "github-light", dark: "github-dark" } as const;

let highlighterPromise: Promise<Highlighter> | null = null;

/** Lazily create ONE shared Shiki highlighter. The `import("shiki")` is dynamic
 * so Shiki never loads during SSR — only when `highlight()` is first called on
 * the client. */
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    // Pure-JS regex engine (no WASM) so it loads cleanly in the browser.
    highlighterPromise = Promise.all([
      import("shiki"),
      import("shiki/engine/javascript"),
    ]).then(([{ createHighlighter }, { createJavaScriptRegexEngine }]) =>
      createHighlighter({
        themes: [THEMES.light, THEMES.dark],
        langs: LANGS,
        engine: createJavaScriptRegexEngine(),
      }),
    );
  }
  return highlighterPromise;
}

/** Highlight `code` to HTML, dual-themed (no default color — the CSS picks). */
export async function highlight(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: LANGS.includes(lang) ? lang : "text",
    themes: THEMES,
    defaultColor: false,
  });
}
