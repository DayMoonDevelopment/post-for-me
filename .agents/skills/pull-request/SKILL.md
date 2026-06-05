---
name: pull-request
description: >-
  Open a high-quality pull request for the post-for-me monorepo and wire it to
  its Linear issue. Use this skill whenever the user wants to open/create/raise
  a PR, "put this up for review", push a branch for review, or finalize a change
  for merge — even if they don't say the words "pull request". It covers branch
  naming (feat/fix/chore), the PR body template, tagging the Linear issue in the
  body so it auto-closes on merge, and auto-attaching the PR link to the Linear
  issue via the Linear MCP. Reach for it any time work is ready to become a PR.
---

# Opening a pull request

This repo is a dumb monorepo of independent siblings (`api/`, `trigger/`, `dashboard/`, `marketing/`). A PR almost always touches **one** sibling — keep it scoped, and run that sibling's checks before opening.

Work through these steps in order. The goal is a PR a reviewer can understand without opening the diff, linked to its Linear issue so status stays in sync automatically.

## 1. Branch

Branches are prefixed by change type. Only three prefixes — keep it simple:

- `feat/` — new functionality or user-facing capability
- `fix/` — bug fix or correcting broken behavior
- `chore/` — everything else: deps, config, tooling, docs, refactors, test-only changes

Use a short kebab-case description: `feat/posthog-conversion-tracking`, `fix/webhook-signature-check`, `chore/bump-react-router`.

If the current branch is `main` or doesn't carry one of these prefixes, create a correctly-prefixed branch off `main` before committing — never open a PR from `main`. (The Linear-generated `caleb/pfm-123-...` branch names are fine too if one already exists; the prefix rule is for branches we create.)

## 2. Commit

Follow the repo's commit conventions (conventional-commit style, `type(scope): summary`, and the `Co-Authored-By` footer the harness requires). Commit and push only when the user has asked you to.

## 3. Identify the Linear issue

Find the issue this PR resolves. Look, in order:

1. The branch name (`caleb/pfm-576-...` → `PFM-576`).
2. What the user told you in conversation.
3. If neither, ask the user for the issue ID before opening the PR — the link/tag steps depend on it.

## 4. Write the PR body

The title should read like a conventional commit: `type(scope): concise summary` (e.g. `feat(dashboard): track conversion events in PostHog`).

Use this body template. Every section earns its place — a reviewer should grasp **what changed and why** without reading the diff, and know **how you verified it**.

```markdown
## Summary

1–3 sentences: what this PR does and why it's needed. Lead with the user/business
reason, not the implementation.

## Changes

- The notable changes, as bullets. Group by area if the PR is large.
- Call out anything a reviewer should pay special attention to.
- Note new dependencies, env vars, or migrations explicitly.

## Testing

How you verified this works — commands run, manual steps, what you observed.
If something is untested or deferred, say so plainly.

## Notes

(Optional) Known limitations, follow-ups, or decisions worth flagging.
Screenshots/recordings go here for any UI change.

Closes PFM-XXX

🤖 Generated with AI
```

Guidance on the sections:

- **Summary** — the "why" matters more than the "what". A reviewer skims this first.
- **Changes** — bullets, not prose. Surface migrations / new env vars / new deps because they have deploy implications and are easy to miss in a diff.
- **Testing** — be honest. "Typecheck + lint pass; drove the real Stripe checkout flow against a local team and confirmed `customer_converted` in PostHog" is far more useful than "tested locally". If tests failed or a step was skipped, report it.
- **`Closes PFM-XXX`** — this magic word is required. On merge it auto-moves the Linear issue to Done. Use `Closes` (or `Fixes`) for the issue the PR resolves; for issues it only relates to, write `Part of PFM-YYY` so they aren't auto-closed.

## 5. Open the PR

Use the `gh` CLI:

```bash
gh pr create --title "type(scope): summary" --body "$(cat <<'EOF'
...body from the template...
EOF
)"
```

Capture the returned PR URL — you need it for the next step.

## 6. Link the PR and move the issue — via the Linear MCP

We have the Linear MCP, so do both of these directly rather than depending on Linear's GitHub automation:

1. **Attach the PR as an explicit link** on the issue (the manual "Add link / Ctrl+L" step), via the `save_issue` tool's `links` param:
   - `id`: the issue identifier (e.g. `PFM-576`)
   - `links`: `[{ "url": "<PR URL>", "title": "<PR title or 'GitHub PR #NN'>" }]`
   - `links` is append-only, so this won't disturb existing attachments.

2. **Move the issue to `In Review`** in the same `save_issue` call (`state: "In Review"`), so status reflects reality without relying on the GitHub integration being configured. (Merging still auto-closes it to Done via the `Closes` tag.)

After this, confirm to the user with the PR URL and the issue you linked + moved.

## Quick checklist

- [ ] Branch prefixed `feat/` / `fix/` / `chore/`, off `main`
- [ ] Sibling's `bun run typecheck` + `bun run lint` pass (cd into the sibling first)
- [ ] PR title in `type(scope): summary` form
- [ ] Body has Summary / Changes / Testing, with migrations/env/deps called out
- [ ] `Closes PFM-XXX` in the body
- [ ] Generated-with-Claude-Code footer present
- [ ] PR URL attached to the Linear issue via the MCP, and the issue moved to `In Review`
