---
name: rhino-ship-pr
description: >
  Shepherd a cameron-nye/rhino pull request until Validate is green and the
  factory reviewer has passed the head SHA, then let automerge squash-merge it.
  Bugbot is not a gate. File leftover friction on this fork. Use when a pull
  request in this fork needs to be finished. Never call Kent's ship-pr package
  or post to Discord.
---

# Ship a Rhino pull request

This checkout is `cameron-nye/rhino`. Do not run `kody:@kentcdodds/ship-pr/tick`
or any other `@kentcdodds/ship-pr`, `@kentcdodds/friction-log`, or
`@kentcdodds/discord` export. Do not post to Discord. The auto-merge workflow
sends the pull request notices. Do not open issues or comments on Kent's
repositories. Leftover papercuts go through
[rhino-friction](../rhino-friction/SKILL.md).

Automerge is `.github/workflows/automerge.yml` on the default branch. The policy
is `.github/automerge/SPEC.md`. It does not check out the pull request and it
does not run pull request code. Bugbot is not a gate.

## Gates

All of these must hold on the current head SHA. Push again when one is missing
or stale:

- Base `main`, head branch in this repository, not a draft, author login
  `cameron-nye`.
- Head branch is `cursor/*`, `habits/issue-*`, or `factory/*`.
- `✅ Validate` completed with conclusion `success` on that SHA. The latest
  attempt wins. Queued and in-progress runs wait. Cancelled, skipped, neutral,
  stale, and failure do not pass.
- A factory reviewer marker for that SHA says pass:
  `<!-- factory-review: verdict=pass sha=<40-hex head> -->`.
  `@cam/rhino-pr-review` posts it as a pull request review with Cameron's user
  token. A marker in an issue comment, a review comment, or an edited,
  dismissed, or pending review does not count. Until that package exists,
  `cursor/*` pull requests do not merge. After 60 minutes the workflow posts one
  stuck notice. That is intended. Do not merge by hand to get past it.
- If a lookup the decision needs errors or is truncated, the pull request waits.
  It is not eligible.
- No `factory-fixup-running` label, and no `no-automerge` label.
- The diff is not on a manual path, and it does not add a dependency, bump a
  major (a `0.x` minor bump counts), or mention a device test.

High risk (workflows, Wrangler, migrations, billing, auth, secrets, signing,
patches, `packages/shared`) is manual because of those paths. Also add
`no-automerge` when Cameron should merge by hand, including any change to the
auto-merge workflow. Do not merge by hand unless Cameron asked.

A verdict of `fail` does not merge. Fix the finding and wait for a pass marker
on the new SHA.

## After the merge

The workflow squash-merges with the head SHA pinned. It closes issues linked
from the pull request body, then dispatches production deploy and preview
cleanup. A `GITHUB_TOKEN` merge does not start those workflows by itself.
