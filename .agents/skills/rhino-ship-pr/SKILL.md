---
name: rhino-ship-pr
description: >
  Shepherd a cameron-nye/rhino pull request until Validate and Cursor Bugbot are
  clear, then let rhino-automerge squash-merge it. File leftover friction on
  this fork. Use when a pull request in this fork needs to be finished. Never
  call Kent's ship-pr package or post to Discord.
---

# Ship a Rhino pull request

This checkout is `cameron-nye/rhino`. Do not run `kody:@kentcdodds/ship-pr/tick`
or any other `@kentcdodds/ship-pr`, `@kentcdodds/friction-log`, or
`@kentcdodds/discord` export. Do not post to Discord. Do not open issues or
comments on Kent's repositories. Leftover papercuts go through
[rhino-friction](../rhino-friction/SKILL.md).

Automerge is `.github/workflows/rhino-automerge.yml`. It squash-merges only when
every gate below is true. It does not merge a fork, a draft, a base other than
`main`, a branch that does not start with `cursor/`, a pull request whose author
login is not `cameron-nye`, or a pull request labeled `no-automerge`.

## Gates

Wait for both of these on the current head SHA, then push again if either is
missing or stale:

- `✅ Validate` completed with conclusion `success`.
- The GitHub check run named `Cursor Bugbot` (Cursor GitHub App slug `cursor`)
  completed with conclusion `success` or `neutral`. The name is from
  [Cursor's Bugbot docs](https://cursor.com/docs/bugbot), under CI check
  statuses. `failure` and a missing check do not merge. `neutral` is Bugbot's
  default when it reports findings, so it is not a clean review by itself.

Repository variable `RHINO_REQUIRE_BUGBOT` defaults to on. Automerge skips the
Bugbot check only when that variable is `false`, `0`, `no`, or `off`. Leave the
variable unset unless Cameron disabled the gate. When the gate is on and Bugbot
has not reported, leave the pull request open. Do not comment `bugbot run` or
`cursor review` from an agent or a GitHub App. Bugbot ignores those commands
from bots.

## Bugbot findings

Read unresolved review threads before expecting a merge. Automerge refuses while
any unresolved thread was opened by the Cursor bot (`author.__typename` is `Bot`
and `author.login` is `cursor`, `cursor[bot]`, or `cursor-bot`).

For each of those threads:

1. Fix a valid finding and push, or answer it when the finding should not
   change. Reply with Cursor `ManagePullRequest` `post_comment` (`in_reply_to`
   the review comment). Do not use `@kentcdodds/github`.
2. Resolve the thread after the fix or the answer:

```bash
gh api graphql \
  -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' \
  -f id='THREAD_NODE_ID'
```

A 403 from `gh` means this token cannot resolve threads. Say that on the pull
request and stop. Do not expect automerge until the threads are resolved. Do not
fall back to Kent's bot.

3. Wait until `Cursor Bugbot` has completed again on the new head SHA and no
   unresolved Cursor bot threads remain. `Cursor Bugbot Autofix` is a separate
   check. Automerge does not wait on it.

High risk (auth, secrets, billing, data migrations, destructive changes, or
anything hard to undo) gets the `no-automerge` label and waits for Cameron.
Other ready pull requests stay unlabeled so automerge can squash-merge, then
dispatch production deploy and preview cleanup. Do not merge by hand unless
Cameron asked.
