import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

// Pull request 22 linked issue 18 from the body. The squash commit did not
// repeat that keyword, and the merge token had no issues permission, so the
// issue stayed open. Copying the body into the merge API would replace
// GitHub's default squash message, so the close uses the recorded references.
test('automerge closes issues linked from the pull request body', () => {
	const job = workflow.slice(workflow.indexOf('jobs:'))
	const permissions = job.slice(
		job.indexOf('permissions:'),
		job.indexOf('steps:'),
	)
	expect(permissions).toMatch(/^ {6}issues: write$/m)
	expect(workflow).not.toContain('commit_message')
	expect(workflow).not.toContain('commit_title')

	const body = functionBody('close_linked_issues')
	expect(body).toContain('closingIssuesReferences')
	expect(body).toContain('state_reason=completed')
	expect(body).toContain('state=closed')
	expect(body).toContain('The squash merge stands.')
	expect(body).not.toContain('exit 1')
	expect(body).not.toContain('return 1')
	expect(body).toContain('return 0')

	const calls = workflow.match(/close_linked_issues "\$number"/g)
	expect(calls).toHaveLength(1)
	const squashNote = workflow.indexOf('Squash-merged #${number}')
	const closeCall = workflow.indexOf(
		'close_linked_issues "$number"',
		squashNote,
	)
	const cleanupCall = workflow.indexOf(
		'dispatch_preview_cleanup "$number"',
		squashNote,
	)
	expect(closeCall).toBeGreaterThan(squashNote)
	expect(cleanupCall).toBeGreaterThan(closeCall)
	const alreadyAt = workflow.indexOf('already squash-merged by Actions')
	expect(workflow.slice(alreadyAt, squashNote)).not.toContain(
		'close_linked_issues',
	)

	const open = runClose({
		'': referencesPage(
			[
				{ number: 23, state: 'OPEN' },
				{ number: 18, state: 'CLOSED' },
				{ number: 7, state: 'OPEN', repo: 'octo-org/octo-repo' },
				{ number: 'nope', state: 'OPEN' },
			],
			{ hasNextPage: true, endCursor: 'page-2' },
		),
		'page-2': referencesPage([{ number: 24, state: 'open' }], {
			hasNextPage: false,
			endCursor: null,
		}),
	})
	expect(open.issues).toEqual(['23', '24'])
	expect(open.stdout).toContain('Closed #23 from squash-merge of #22.')
	expect(open.stdout).toContain('Closed #24 from squash-merge of #22.')
	expect(open.stdout).toContain('Linked issue #18 is already closed.')
	expect(open.stdout).toContain(
		'Skipping linked issue octo-org/octo-repo#7: not in cameron-nye/rhino.',
	)
	expect(open.stdout).toContain('Skipping an unexpected linked issue id')
	expect(open.graphql).toContain('closingIssuesReferences')
	for (const args of open.patches) {
		expect(args).toContain('state=closed')
		expect(args).toContain('state_reason=completed')
		expect(
			args.some((arg) => arg.startsWith('repos/cameron-nye/rhino/issues/')),
		).toBe(true)
	}

	const none = runClose({
		'': referencesPage([], { hasNextPage: false, endCursor: null }),
	})
	expect(none.issues).toEqual([])
	expect(none.stdout).not.toContain('WARN')

	const unusable = runClose({
		'': { body: { data: { repository: { pullRequest: null } } } },
	})
	expect(unusable.issues).toEqual([])
	expect(unusable.stdout).toContain('was unusable')
	expect(unusable.stdout).toContain('The squash merge stands.')

	const graphqlDown = runClose({ '': { exit: 1 } })
	expect(graphqlDown.issues).toEqual([])
	expect(graphqlDown.stdout).toContain('Could not read linked issues')

	const missingCursor = runClose({
		'': referencesPage([{ number: 23, state: 'OPEN' }], {
			hasNextPage: true,
			endCursor: null,
		}),
	})
	expect(missingCursor.issues).toEqual(['23'])
	expect(missingCursor.stdout).toContain('had no cursor')

	const patchFails = runClose(
		{
			'': referencesPage([{ number: 23, state: 'OPEN' }], {
				hasNextPage: false,
				endCursor: null,
			}),
		},
		{ patchFail: true },
	)
	expect(patchFails.issues).toEqual(['23'])
	expect(patchFails.stdout).toContain('Failed to close #23')
	expect(patchFails.stdout).toContain('The squash merge stands.')

	const pages: Record<string, PageFixture> = {}
	let cursor = ''
	for (let index = 0; index < 10; index += 1) {
		const next = `page-${index + 1}`
		pages[cursor] = referencesPage([], {
			hasNextPage: true,
			endCursor: next,
		})
		cursor = next
	}
	const pagedOut = runClose(pages)
	expect(pagedOut.issues).toEqual([])
	expect(pagedOut.stdout).toContain('did not finish paging')
})

const fakeGh = `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(process.env.GH_LOG, JSON.stringify(args) + '\\n')
if (args[0] === 'api' && args[1] === 'graphql') {
	const raw = fs.readFileSync('/dev/stdin', 'utf8')
	fs.appendFileSync(process.env.GH_LOG, 'STDIN ' + JSON.stringify(raw) + '\\n')
	const body = JSON.parse(raw)
	const cursor = body.variables && body.variables.cursor
	const key = cursor == null || cursor === '' ? '' : String(cursor)
	const pages = JSON.parse(fs.readFileSync(process.env.GH_PAGES, 'utf8'))
	const page = pages[key]
	if (!page) {
		console.error('missing page for ' + JSON.stringify(key))
		process.exit(1)
	}
	if (page.exit) {
		console.error(page.error || 'graphql failed')
		process.exit(page.exit)
	}
	process.stdout.write(JSON.stringify(page.body))
	process.exit(0)
}
const methodIndex = args.indexOf('--method')
if (methodIndex !== -1 && args[methodIndex + 1] === 'PATCH') {
	if (process.env.GH_PATCH_FAIL === '1') {
		console.error('Resource not accessible by integration')
		process.exit(1)
	}
	process.stdout.write('{"state":"closed"}\\n')
	process.exit(0)
}
console.error('unexpected gh invocation: ' + args.join(' '))
process.exit(1)
`

type LinkedNode = {
	number: number | string
	state: string
	repo?: string
}

type PageFixture = {
	exit?: number
	error?: string
	body?: unknown
}

function referencesPage(
	nodes: LinkedNode[],
	pageInfo: { hasNextPage: boolean; endCursor: string | null },
): PageFixture {
	return {
		body: {
			data: {
				repository: {
					pullRequest: {
						closingIssuesReferences: {
							pageInfo,
							nodes: nodes.map((node) => ({
								number: node.number,
								state: node.state,
								repository: {
									nameWithOwner: node.repo ?? 'cameron-nye/rhino',
								},
							})),
						},
					},
				},
			},
		},
	}
}

function runClose(
	pages: Record<string, PageFixture>,
	options?: { patchFail?: boolean },
) {
	const root = mkdtempSync(join(tmpdir(), 'rhino-automerge-'))
	const bin = join(root, 'bin')
	mkdirSync(bin)
	writeFileSync(join(bin, 'gh'), fakeGh, { mode: 0o755 })
	const pagesPath = join(root, 'pages.json')
	const logPath = join(root, 'gh.log')
	writeFileSync(pagesPath, JSON.stringify(pages))
	writeFileSync(logPath, '')
	const script = `set -euo pipefail
note() { printf 'NOTE %s\\n' "$*"; }
warn() { printf 'WARN %s\\n' "$*"; }
REPOSITORY='cameron-nye/rhino'
${functionBody('close_linked_issues')}
}
close_linked_issues 22
`
	let stdout = ''
	try {
		stdout = execFileSync('bash', ['--noprofile', '--norc', '-s'], {
			input: script,
			encoding: 'utf8',
			env: {
				...process.env,
				PATH: `${bin}:${process.env.PATH ?? ''}`,
				GH_LOG: logPath,
				GH_PAGES: pagesPath,
				GH_PATCH_FAIL: options?.patchFail ? '1' : '0',
				GH_TOKEN: 'test-token',
			},
		})
	} catch (error) {
		const failed = error as {
			status?: number
			stdout?: string
			stderr?: string
		}
		throw new Error(
			`close_linked_issues exited ${failed.status ?? 'unknown'}\n${failed.stdout ?? ''}\n${failed.stderr ?? ''}`,
		)
	}
	const log = readFileSync(logPath, 'utf8')
	const patches: string[][] = []
	const graphql: string[] = []
	for (const line of log.split('\n')) {
		if (line.startsWith('STDIN ')) {
			graphql.push(JSON.parse(line.slice('STDIN '.length)) as string)
			continue
		}
		if (!line.startsWith('[')) continue
		const args = JSON.parse(line) as string[]
		const method = args.indexOf('--method')
		if (method !== -1 && args[method + 1] === 'PATCH') patches.push(args)
	}
	return {
		stdout,
		patches,
		graphql: graphql.join('\n'),
		issues: patches.map((args) => {
			const url = args.find((arg) => arg.includes('/issues/')) ?? ''
			const match = url.match(/\/issues\/(\d+)$/)
			return match?.[1] ?? ''
		}),
	}
}
