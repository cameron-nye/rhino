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
