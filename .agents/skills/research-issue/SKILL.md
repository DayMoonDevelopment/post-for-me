---
name: research-issue
description: >-
  Investigate a Linear issue by ID (e.g. PFM-576) and post an internal research
  comment on it — root-cause findings written for the team, not for the
  customer. Use this skill whenever the user gives a Linear issue ID or URL and
  asks to "look into", "investigate", "research", "dig into", "triage", or
  "figure out what's going on with" it, or asks for an internal note/comment on
  an issue — even if they don't say "research comment". Read-only on the
  codebase: it gathers context, traces the cause, and writes findings back to
  Linear; it does not fix the issue.
---

# Linear issue research

Given a Linear issue ID, investigate it and post an **internal research comment** on the issue. The comment is for the team (engineering, support) to pick up the issue with the groundwork already done. It is **not** a reply to the customer, even when the issue originated from a customer report.

This is investigation only. Don't edit code, change the issue's status/assignee/labels, or open a PR unless the user asks separately. The one write you make is the comment.

## 1. Load the issue

Resolve the ID the user gave (`PFM-576`, or extract it from a Linear URL), then pull full context with the Linear MCP:

- `get_issue` — title, description, state, labels, project, attachments, linked issues/PRs
- `list_comments` — the thread often holds the reproduction details, customer quotes, or earlier theories. Read all of it so you don't repeat or contradict prior findings.
- `extract_images` — if the description or comments embed screenshots, look at them; error messages and request payloads often live there only.

If the issue can't be found, say so and stop — don't guess at a different issue.

Pin down, in your own words: what is the reported symptom, who/what is affected (platform, account, post ID, endpoint), and what would "fixed" look like. Note anything missing from the report that you'll need to flag later.

## 2. Investigate

Work out which sibling owns the problem (`api/`, `trigger/`, `dashboard/`, `marketing/` — see the `monorepo-structure` skill) and trace it from the symptom to a cause. Use whichever of these fit the issue:

- **Code** — find the relevant modules and follow the path end to end. Read the code rather than inferring from names. Note file paths and line numbers (`api/src/social-posts/...:123`) so the team can jump straight there. Check `git log` / `git blame` on suspicious areas for recent changes that could explain a regression.
- **Trigger.dev runs** — for posting/processing failures, the Trigger MCP (`list_runs`, `get_run_details`, `get_span_details`) shows what actually happened for a given post. Prefer real run evidence over speculation.
- **Production signals** — PostHog error tracking or logs, if the issue involves an exception or behavior change.
- **Platform behavior** — for social-platform quirks (TikTok, YouTube, Instagram, etc.), check the platform's API docs rather than relying on memory; limits and requirements change.
- **Related issues** — `list_issues` for similar reports, duplicates, or prior fixes worth linking.

Keep going until you can state a cause with some confidence, or until you've exhausted what's reachable. Stopping at "I couldn't confirm it" is a legitimate result — but say exactly what you tried.

Keep **confirmed** facts separate from **hypotheses** as you go. The reader will act on what you write, so mislabeling a guess as a finding costs them time.

## 3. Write the comment

Post with `save_comment` as a **new top-level comment** (`issueId` only — no `parentId`). Replying inside an existing thread risks surfacing the note in a customer-facing sync (support-tool or Slack integrations mirror threads), so keep it standalone.

Audience and tone: a teammate who knows the codebase but hasn't looked at this issue. Be direct and technical. Don't address the customer, don't draft a customer reply, don't apologize or reassure. Open with a line marking it internal so nobody mistakes it for a response.

Use this structure, dropping sections that have nothing to say:

```markdown
**Internal research — not for customer**

## TL;DR
One to three sentences: what's happening and the likely fix direction.

## What's happening
The symptom as reproduced or understood, and the cause if found. Reference
specific files/lines, run IDs, or log evidence.

## Evidence
- What you checked and what it showed (code paths, Trigger runs, logs, docs).

## Suggested fix
The approach you'd take, which sibling/files it touches, and any risk
(migrations, platform API limits, backwards compatibility).

## Open questions / unconfirmed
- Hypotheses you couldn't verify, info missing from the report, who might know.

## Related
- Linked issues, PRs, or prior fixes.
```

Guidance:

- **Lead with the answer.** The TL;DR is what most people will read.
- **Be honest about confidence.** "Confirmed via run `run_abc123`" vs. "likely, but I couldn't reproduce" are very different statements; use that kind of wording.
- **Don't paste secrets or customer PII** (API keys, tokens, emails, full request bodies). Reference IDs instead.
- **Be concise.** Link to code and runs rather than quoting large blocks.

## 4. Report back

After posting, tell the user the issue ID, the comment's TL;DR, and anything notable that doesn't belong in the comment (e.g. you spotted an unrelated bug). Don't paste the whole comment back.
