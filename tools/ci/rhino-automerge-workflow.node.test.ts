import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const workflow = readFileSync(
	new URL('../../.github/workflows/rhino-automerge.yml', import.meta.url),
	'utf8',
)

function functionBody(name: string) {
	const start = workflow.indexOf(`${name}() {`)
	expect(start).toBeGreaterThanOrEqual(0)
	const end = workflow.indexOf('\n          }', start)
	expect(end).toBeGreaterThan(start)
	return workflow.slice(start, end)
}

test('automerge job can dispatch workflows', () => {
	const job = workflow.slice(workflow.indexOf('jobs:'))
	expect(job).toContain('actions: write')
	expect(job).toContain('contents: write')
	expect(job).toContain('pull-requests: write')
})

test('preview cleanup dispatch targets the pull request and does not fail the merge', () => {
	const body = functionBody('dispatch_preview_cleanup')
	expect(body).toContain(
		'gh api --method POST "repos/${REPOSITORY}/actions/workflows/preview.yml/dispatches"',
	)
	expect(body).toContain(
		'{ref:"main", inputs:{action:"cleanup", target:"pr", pr_number:$pr_number}}',
	)
	expect(body).toContain('warn "')
	expect(body).toContain('return 0')
	expect(body).not.toContain('exit 1')
	expect(body).not.toContain('return 1')
	const warn = functionBody('warn')
	expect(warn).toContain('::warning::')
})

test('preview cleanup runs after a fresh squash merge and an Actions merge', () => {
	const calls = workflow.match(/dispatch_preview_cleanup "\$number"/g)
	expect(calls).toHaveLength(2)

	const mergedAt = workflow.indexOf('merged_now=1')
	const mergedCall = workflow.indexOf(
		'dispatch_preview_cleanup "$number"',
		mergedAt,
	)
	expect(mergedCall).toBeGreaterThan(mergedAt)
	expect(workflow.slice(mergedAt, mergedCall)).toContain(
		'Squash-merged #${number}',
	)

	const alreadyAt = workflow.indexOf('already squash-merged by Actions')
	const alreadyCall = workflow.indexOf(
		'dispatch_preview_cleanup "$number"',
		alreadyAt,
	)
	expect(alreadyCall).toBeGreaterThan(alreadyAt)
	expect(workflow.slice(alreadyAt, alreadyCall)).not.toContain('exit')

	const staleAt = workflow.indexOf('bot merge is older than 24 hours')
	expect(staleAt).toBeGreaterThan(-1)
	expect(staleAt).toBeLessThan(alreadyAt)
	expect(workflow.slice(staleAt, alreadyAt)).not.toContain(
		'dispatch_preview_cleanup',
	)
})

test('automerge re-checks Validate and Cursor Bugbot on both triggers', () => {
	expect(workflow).toContain("workflows:\n      - '✅ Validate'")
	expect(workflow).toContain('check_run:')
	expect(workflow).toContain("github.event.check_run.name == 'Cursor Bugbot'")
	expect(workflow).toContain("github.event.check_run.app.slug == 'cursor'")
	expect(workflow).toContain('checks: read')
	expect(workflow).toContain('vars.RHINO_REQUIRE_BUGBOT')
	expect(workflow).toContain(
		'https://cursor.com/docs/bugbot (CI check statuses)',
	)

	const requireBugbot = functionBody('require_bugbot')
	expect(requireBugbot).toContain('false|0|no|off')
	expect(requireBugbot).toContain('*) return 0 ;;')

	const validate = functionBody('validate_green')
	expect(validate).toContain('event=pull_request')
	expect(validate).toContain('conclusion')
	expect(validate).toContain('return 0')
	expect(validate).not.toContain('exit 1')

	const bugbot = functionBody('bugbot_check_clear')
	expect(bugbot).toContain('check_name=Cursor%20Bugbot')
	expect(bugbot).toContain('Cursor Bugbot has not reported')
	expect(bugbot).toContain('success|neutral')
	expect(bugbot).toContain('concluded')
	expect(bugbot).not.toContain('exit 1')

	expect(workflow).toContain('if ! validate_green; then')
	expect(workflow).toMatch(/if ! validate_green; then\n\s+exit 0/)

	const threads = functionBody('bugbot_threads_clear')
	expect(threads).toContain('isResolved')
	expect(threads).toContain('__typename')
	expect(threads).toContain('cursor[bot]')
	expect(threads).toContain('unresolved Cursor Bugbot review thread(s)')
	expect(threads).not.toContain('exit 1')

	const threadCall = workflow.indexOf('bugbot_threads_clear "$number"')
	const mergeCall = workflow.indexOf('pulls/${number}/merge')
	expect(threadCall).toBeGreaterThan(-1)
	expect(mergeCall).toBeGreaterThan(threadCall)
	const threadGuard = workflow.lastIndexOf(
		'if require_bugbot; then',
		threadCall,
	)
	expect(threadGuard).toBeGreaterThan(-1)
	expect(threadCall - threadGuard).toBeLessThan(120)

	expect(workflow).toContain('author')
	expect(workflow).toContain('cameron-nye')
	expect(workflow).toContain('no-automerge')
	expect(workflow).toContain('base_ref')
	expect(workflow).toContain('"main"')
	expect(workflow).toContain('cursor/*')
	expect(workflow).toContain(
		'[[ -n "$HEAD_BRANCH" && "$HEAD_BRANCH" != cursor/* ]]',
	)
})
