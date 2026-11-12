# Auto-merge + Discord PR notifications — approved policy (Cameron, 2026-11-11)

## 1. Merge rule — ALL must hold on the PR's current head SHA

1. Base `main`; head branch in this repo (no forks); not draft; PR author
   `cameron-nye`.
2. Head branch is `cursor/*` OR a factory branch. Factory prefixes are one
   config list: `habits/issue-` and `factory/`.
3. The repo's CI workflow (`✅ Validate` for Rhino) has a run on exactly the
   head SHA whose latest attempt concluded `success`. queued / in_progress /
   skipped / cancelled / neutral / stale never pass.
4. Bugbot is NOT a gate.
5. A factory reviewer verdict marker for exactly the head SHA says pass:
   `<!-- factory-review: verdict=pass sha=<40-hex head> -->`. Accept it only
   from a pull request review, never from an issue comment or a pull request
   review comment, and only when that review's `user.login` is the configured
   author (`cameron-nye`). The factory posts the review with Cameron's user
   token, and the repo has no other collaborators. Ignore a marker in an edited
   review (`lastEditedAt` is set) or in a dismissed or pending review. The
   latest accepted marker for that SHA wins. Markers for other SHAs are ignored.
   Required for cursor/* PRs too. No `factory-fixup-running` label on the PR.
6. No size cap.
7. No `no-automerge` label. Head unchanged at merge (re-read, then
   `PUT /pulls/{n}/merge` with `sha=<head>`); squash merge.
8. If CI has not concluded, or no verdict exists, 60 minutes after the head was
   pushed (first workflow run `created_at` for the SHA, else the commit date),
   don't merge; post one "stuck or failed" notice per head SHA. A
   `factory-fixup-running` label older than 4 h is also "stuck".
9. Fail closed. If any GitHub lookup that eligibility depends on errors or is
   cut short, the pull request is not eligible: treat it as "wait", and as
   "stuck" once the same 60 minute timeout has passed. That covers linked issues
   (`closingIssuesReferences`), the files or diff (including `package.json`
   contents used for dependency checks), workflow runs, reviews, and labels
   (including fix-up label events). Paginate fully. Hitting a page or count
   limit is truncation, which is also not eligible. The only exception is
   closing linked issues after a merge, which may still warn and does not undo
   the merge.

## 2. Always manual (skip merge; post "ready for Cameron" with the reasons)

The path globs are in the config `manualPaths`. Also manual:

- new dependencies or major version bumps in any package.json dependency section
  (for 0.x, a minor bump counts as major)
- the PR body or a linked issue (closingIssuesReferences) matching
  `deviceTestPattern`
- a reviewer verdict of fail
- the `no-automerge` label

Renames count both the old and new paths. There's no manual rule for UX/product
changes.

## 3. Triggers (all execute the default-branch workflow)

- `workflow_run` completed, for both the CI workflow and "Auto-merge signal".
- `pull_request_target`: opened, reopened, synchronize, labeled, unlabeled,
  ready_for_review, edited.
- `issue_comment` created.
- `schedule` every 15 minutes, as the timeout sweep.
- `workflow_dispatch`.

Reviews arrive as `pull_request_review`, so a tiny `automerge-signal.yml` (no
permissions, no checkout) exists only to fire `workflow_run`. Each run evaluates
every open PR on main. Use one concurrency group per repo, with no
cancel-in-progress.

## 4. Discord

- **Channels:** "ready for Cameron" goes to pr-ready, when CI is green and the
  verdict is in but the PR isn't auto-mergeable; include the reasons. "Stuck or
  failed" goes to pr-ready. "Auto-merged" goes to pr-merged.
- **Message:** state, repo, PR number and title, link, and reason. Strip `@` and
  backticks from titles.
- **Dedupe:** per PR + SHA + state, using a hidden PR comment
  `<!-- automerge-notify: state=<s> sha=<sha> -->`. If Discord returns non-2xx,
  write no marker, so the next run retries.
- **Missing secret:** call `core.warning`, skip the post, write the marker with
  "Discord: skipped", and keep the job green.

## 5. After merge

- Close linked issues (closingIssuesReferences that are still OPEN) with
  state_reason completed. A failed close only warns.
- A GITHUB_TOKEN merge doesn't start push workflows, so dispatch deploy.yml and
  the preview cleanup as described in the Rhino binding below.

## 6. Acceptance tests (node:test)

- Happy path, plus cursor/* and factory/* branches.
- Ignores: draft, fork, author, base, branch, closed.
- CI failure gives failed. Cancelled, skipped, neutral and stale never pass.
  Queued waits, then goes stuck after 60 min. CI on another SHA is ignored. The
  latest attempt wins.
- A verdict for an older SHA is ignored. A verdict of fail gives ready. No
  verdict after 60 min gives stuck. A pass marker from another user, from an
  issue comment, or from an edited, dismissed, or pending review is ignored.
- A lookup that errors or is truncated waits, then goes stuck after 60 min. That
  includes linked issues, files, workflow runs, reviews, and labels.
- The fix-up label waits, and goes stuck when stale. `no-automerge` gives ready.
- A 300-file PR still merges.
- Every `__mustBeManual` path gives ready; every `__mustBeAuto` path gives
  merge. A rename from a manual path gives ready.
- Device-test text in the PR or a linked issue gives ready.
- New-dependency and major-bump detection.
- The workflow's config block equals the fixture config.
- run.js against a fake GitHub:
  - the merge is pinned to the SHA, with squash
  - the linked issue gets closed
  - one Discord post per PR + SHA + state
  - a missing secret only warns
  - the webhook URL never appears anywhere
  - deploy and preview dispatches fire after a merge

## Rhino binding

`AUTOMERGE_CONFIG` in `.github/workflows/automerge.yml` is the fixture
`.github/automerge/test/fixtures/config.json`, including the `__mustBeManual`
and `__mustBeAuto` lists the tests read. Eligibility ignores keys it does not
use.

The repo `package.json` is `"type": "module"`, so the Actions step loads
`run.js` with `import()` of the default-branch file. `require()` of that file
throws `ERR_REQUIRE_ESM`. The step still calls the default export with
`{ github, context, core }`.

Checkout is `actions/checkout@v6.0.2` (the pin Validate already uses) of
`github.event.repository.default_branch`, sparse path `.github/automerge`,
`persist-credentials: false`. `actions/github-script` is the same commit
Validate's other scripts use (`v8.0.0`). The draft's floating `checkout@v4` and
`github-script@v7` tags are not used.

Post-merge dispatch is the previous `rhino-automerge.yml` contract, called from
`run.js` so the fake-client tests can see it:

- `POST /repos/{owner}/{repo}/actions/workflows/deploy.yml/dispatches` with
  `{ ref: "main", inputs: { mode: "production" } }`.
- Before that, `GET /repos/{owner}/{repo}/actions/workflows/deploy.yml/runs`
  with `event=workflow_dispatch`, `head_sha=<merge sha>`, `per_page=5`. Skip
  when any run is `queued`, `in_progress`, `waiting`, `pending`, `requested`, or
  `conclusion=success`.
- `POST /repos/{owner}/{repo}/actions/workflows/preview.yml/dispatches` with
  `{ ref: "main", inputs: { action: "cleanup", target: "pr", pr_number } }`.
  `pr_number` is a string. A failed preview dispatch warns and does not fail the
  job.
- The squash call is `PUT /repos/{owner}/{repo}/pulls/{n}/merge` with
  `merge_method=squash` and `sha=<head>`. No `commit_title` or `commit_message`,
  so GitHub keeps the default squash message.
- Open linked issues in this repository are `PATCH`ed with `state=closed` and
  `state_reason=completed`.

`manualPaths` adds real Rhino directories that were not in the first list:
`packages/worker/src/api-tokens/**`, `packages/worker/src/webhooks/**`,
`packages/worker/src/mcp/capabilities/webhooks/**`, and
`packages/worker/src/security/**`. Auth modules that are files rather than
directories are also manual: `packages/worker/src/oauth-*`,
`packages/worker/src/mcp-auth*`, and the auth, auth-provider, and Stripe webhook
handlers. Other files in `packages/worker/src/app/handlers/` stay auto.

Concluded CI other than `success` is `failed` (including cancelled, skipped,
neutral, and stale). `no-automerge` is `ready` before CI is read. Path,
dependency, device-test, and verdict-fail reasons are posted once CI has
succeeded. The 15-minute sweep lists open pull requests only, so a dispatch that
crashes after the merge is not retried from a closed pull request; deploy still
skips a SHA that is already queued or green. Each eligibility lookup pages until
the API says it is done. The cap is 40 pages of 100. A further page, a missing
page cursor, a non-array body, or a thrown request marks that pull request
`lookup incomplete`: wait, then stuck after 60 minutes. It is not merged from
the pages already read. Closing a linked issue after the merge still only warns.
A Discord marker comment that fails to post warns and still leaves the merge and
the dispatches in place.
