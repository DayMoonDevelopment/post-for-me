# UI — layout & container patterns

The component catalog is live at **`/showcase`** (dev only) — browse it before building. This doc is the **decision layer above the catalog**: which container/layout to reach for, and the styling rules that keep surfaces consistent. **Before building any page/section, pick the container deliberately and compare against the reference surfaces below — don't default to "wrap it in a card."**

## Choosing a container

| Use | When | Looks like | Reference |
| --- | --- | --- | --- |
| **Table / ReUI Data Grid** (`~/components/data-grid/*` + `~/components/filters`) | A **list of records** you scan/sort/filter/paginate | Full-bleed, server-driven (URL params), manual mode | accounts list (below) |
| **Card** (`rounded-xl border bg-card p-6`) | A **focused, self-contained section** with real content + actions | One bordered panel, a clear heading | tokens card, danger zone, a settings config section |
| **Facts strip** (`Fact` from `~/ui/fact`, in a grid) | A **read-only key→value summary** (ids, dates, status, counts) | Dense grid of uppercase-label → value, **no card per group** | account detail header strip |
| **Grid** (`grid grid-cols-… gap-…`) | **Arranging** the above responsively (columns, 3│2 splits) | Layout only; not a visual container | settings 3│2, detail 2-col |
| **`Empty`** (`~/ui/empty`) | Any **empty state** | Dashed panel, icon + title + description | posts table empty |

**Anti-pattern (learned the hard way):** don't render a handful of label→value rows as their own **sparse card** — that reads empty/sloppy. Use a **facts strip** (`Fact`s in a grid) instead, and reserve cards for sections that earn one (substantial content, a distinct action area, a danger zone).

## Borders & fills — the nested-container rule

**One level of border.** A bordered container should not contain bordered children — "bordered buttons inside a bordered card" is jarring. Inside a card/bordered surface:

- Buttons are **`secondary`** (filled), not `outline`. Destructive stays `destructive`. Group related icon actions in a **`ButtonGroup`**.
- Separate regions with **fills** (`bg-muted`) or a **`Separator`**, not nested borders.
- Action rows sit at the **trailing edge** (`justify-end`).

## Misc consistency rules

- **Icon-only buttons** need a **Tooltip + `aria-label`**.
- **Dates/times** render in `text-foreground` (not muted); user-facing timestamps use the client locale formatter.
- **Empty states** use `Empty`, never a bare `<p>`.
- Every new `~/ui` primitive ships a `/showcase` demo in the same pass.

## Reference surfaces (read these before building a similar one)

- **Record list** — `app/routes/protected/_project.projects.$projectId.social-accounts._index/` (full-bleed grid + Linear-style filters, URL-driven).
- **Resource detail** — `app/routes/protected/_project.social-accounts.$socialAccountId._index/` (identity header + **facts strip** + focused **tokens card** + **danger zone** card + a posts table). The `/<resource>/$id` URL scheme + publishing `projectId` from the loader.
- **Config surface** — `app/routes/protected/_project.projects.$projectId.settings._index/` (config **cards** with per-section edit dialogs; full-bleed read-only).
- **Catalog** — `/showcase`.
