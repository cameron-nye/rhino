import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const workflow = readFileSync(
	new URL('../../.github/workflows/automerge.yml', import.meta.url),
	'utf8',
)
const signal = readFileSync(
	new URL('../../.github/workflows/automerge-signal.yml', import.meta.url),
	'utf8',
)
const runner = readFileSync(
	new URL('../../.github/automerge/run.js', import.meta.url),
	'utf8',
)

test('automerge runs the default-branch policy and does not check out pull request code', () => {
	expect(workflow).toContain("workflows:\n      - '✅ Validate'")
	expect(workflow).toContain("- 'Auto-merge signal'")
	expect(workflow).toContain('pull_request_target:')
	expect(workflow).toContain('issue_comment:')
	expect(workflow).toContain("cron: '*/15 * * * *'")
	expect(workflow).toContain('workflow_dispatch:')
	expect(workflow).not.toContain('check_run:')
	expect(workflow).not.toContain('Cursor Bugbot')
	expect(workflow).not.toContain('github.event.pull_request.head')
	expect(workflow).toContain(
		'ref: ${{ github.event.repository.default_branch }}',
	)
	expect(workflow).toContain('sparse-checkout: .github/automerge')
	expect(workflow).toContain('persist-credentials: false')
	expect(workflow).toContain('group: automerge-${{ github.repository }}')
	expect(workflow).toContain('cancel-in-progress: false')
	const job = workflow.slice(workflow.indexOf('jobs:'))
	expect(job).toContain('actions: write')
	expect(job).toContain('checks: read')
	expect(job).toContain('contents: write')
	expect(job).toContain('pull-requests: write')
	expect(job).toMatch(/^ {6}issues: write$/m)
	expect(workflow).toContain('DISCORD_WEBHOOK_PR_READY')
	expect(workflow).toContain('DISCORD_WEBHOOK_PR_MERGED')
	expect(workflow).toContain('.github/automerge/run.js')
})

test('the review signal workflow has no permissions and no checkout', () => {
	expect(signal).toContain('pull_request_review:')
	expect(signal).toContain('submitted')
	expect(signal).toContain('edited')
	expect(signal).toContain('dismissed')
	expect(signal).toMatch(/^permissions: \{\}$/m)
	expect(signal).not.toContain('actions/checkout')
	expect(signal).not.toContain('secrets.')
	expect(signal).toContain('timeout-minutes: 2')
})

test('preview cleanup and production deploy use the previous dispatch contract', () => {
	expect(runner).toContain("workflow_id: 'preview.yml'")
	expect(runner).toContain("workflow_id: 'deploy.yml'")
	expect(runner).toContain("action: 'cleanup'")
	expect(runner).toContain("target: 'pr'")
	expect(runner).toContain('pr_number: String(number)')
	expect(runner).toContain("ref: 'main'")
	expect(runner).toContain("mode: 'production'")
	expect(runner).toContain("event: 'workflow_dispatch'")
	expect(runner).toContain('per_page: 5')
	expect(runner).toContain('already queued or succeeded')
	expect(runner).toContain('The squash merge stands.')
	expect(runner).not.toContain('exit 1')
	const preview = runner.slice(
		runner.indexOf('async function dispatchPreview'),
		runner.indexOf('async function dispatchDeploy'),
	)
	expect(preview).toContain('core.warning')
	expect(preview).not.toContain('throw error')
})

// Pull request 22 linked issue 18 from the body. The squash commit did not
// repeat that keyword, and the merge token had no issues permission, so the
// issue stayed open. Copying the body into the merge API would replace
// GitHub's default squash message, so the close uses the recorded references.
test('automerge closes issues linked from the pull request body', () => {
	expect(runner).not.toContain('commit_message')
	expect(runner).not.toContain('commit_title')
	expect(runner).toContain("merge_method: 'squash'")
	expect(runner).toContain('closingIssuesReferences')
	expect(runner).toContain("state_reason: 'completed'")
	expect(runner).toContain("state: 'closed'")
	expect(runner).toContain('The squash merge stands.')
	const squash = runner.indexOf('Squash-merged #${number}')
	const close = runner.indexOf('await closeLinked(', squash)
	const preview = runner.indexOf('await dispatchPreview(', squash)
	expect(squash).toBeGreaterThan(-1)
	expect(close).toBeGreaterThan(squash)
	expect(preview).toBeGreaterThan(close)
})
