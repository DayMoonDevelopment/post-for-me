import { Prism } from "prism-react-renderer";

/**
 * Expose prism-react-renderer's bundled Prism instance as the global `Prism`
 * that stand-alone `prismjs/components/*` grammar files attach to. This must run
 * BEFORE any such grammar is imported — {@link ./code-block-languages} imports
 * this module first so the assignment completes before the grammars load.
 */
(globalThis as typeof globalThis & { Prism?: unknown }).Prism = Prism;
