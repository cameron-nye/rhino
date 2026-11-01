---
name: rhino-friction
description: >
  File durable papercuts as GitHub issues on cameron-nye/rhino with gh or the
  GitHub API. Label friction, add friction-skipped when a product decision is
  required, and label polish as improvement. Use when a session in this fork
  hits leftover friction or an improvement. Never file on Kent's repos or
  Discord.
---

# File friction on Rhino

This fork is `cameron-nye/rhino`. File here with the agent's own `gh` auth or
the GitHub API. Do not call `@kentcdodds/friction-log`, `@kentcdodds/github`, or
`@kentcdodds/ship-pr`. Do not open or comment on `kody-hq/kody`,
`kentcdodds/mediarss`, or any other Kent repository. Do not post to Discord. Do
not wake Patch. If `gh` returns 401 or 403, stop and report that. Do not switch
to a Kody bot token.

When to file, and when not to, still follows
[friction-log.md](../../../docs/contributing/friction-log.md). File a durable,
recurring papercut with a clear owner and a reproducible gap. Skip one-off
confusion and session-only nits. Fix an obvious low-risk gap in the current
change when it is already in scope, and mention the fix. File only what is left
over.

Search open issues first. Comment on a match instead of opening a duplicate.

```bash
gh issue list --repo cameron-nye/rhino --state open --label friction --limit 50
gh issue list --repo cameron-nye/rhino --state open --label improvement --limit 20
```

Confirm the target before any write:

```bash
gh repo view cameron-nye/rhino --json nameWithOwner --jq .nameWithOwner
```

That command must print `cameron-nye/rhino`. Refuse any other repository.

## Friction

One papercut per issue. Title prefix `Friction: `. Labels: `friction`.

When the fix needs a product decision from Cameron, also add `friction-skipped`
and write a recommendation. A product decision means the repair changes
behavior, billing, a public contract, or which upstream behavior this fork
keeps, and Cameron has not already decided it.

Create with `gh issue create` or `POST /repos/cameron-nye/rhino/issues`. Pass
every label as its own `--label`. Write the body to a file and pass
`--body-file` so quotes survive.

Required sections, in this order:

- **What happened.** What you were doing and what got in the way.
- **Time lost.** Time lost, how often it happens, who it hits, and the
  workaround.
- **How to reproduce.** Commands, files, or conditions a later agent can follow.
- **Suggested fix.** One concrete change. Do not invent a root cause.
- **Product decision.** `yes` or `no`. When `yes`, add **Recommendation** with
  the decision Cameron should make.
- **Preliminary investigation.** What you already looked at. Keep it short. List
  relevant files only when you know them.

```bash
gh issue create \
  --repo cameron-nye/rhino \
  --title "Friction: short papercut" \
  --label friction \
  --body-file /tmp/rhino-friction.md
```

Add `--label friction-skipped` only when Product decision is `yes`.

## Improvement

Polish and code-quality ideas are not friction. Title prefix `Improvement: `.
Label: `improvement` only. Do not add `friction` or `friction-skipped`. Include
what to polish, why it is worth doing, and a suggested change.

```bash
gh issue create \
  --repo cameron-nye/rhino \
  --title "Improvement: short polish idea" \
  --label improvement \
  --body-file /tmp/rhino-improvement.md
```
