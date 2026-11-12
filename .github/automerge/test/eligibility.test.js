import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
	alreadyNotified,
	buildNotice,
	evaluate,
	NOTIFY_LOGIN,
	notifyMarker,
	preMergeCheck,
} from '../eligibility.js'
import run, { LOOKUP_PAGE_LIMIT } from '../run.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..', '..')
const config = JSON.parse(
	readFileSync(join(here, 'fixtures/config.json'), 'utf8'),
)

const SHA = 'a'.repeat(40)
const OTHER = 'b'.repeat(40)
const MERGE = 'c'.repeat(40)
const NOW = '2026-11-12T12:00:00.000Z'
const READY_SECRET = 'https://hooks.example/pr-ready/super-secret-token-z9'
const MERGED_SECRET = 'https://hooks.example/pr-merged/super-secret-token-z9'
const SECRET_MARK = 'super-secret-token-z9'

function readYamlSingleQuoted(source, key) {
	const marker = `${key}:`
	const start = source.indexOf(marker)
	assert.ok(start >= 0, `${key} is missing`)
	const quote = source.indexOf("'", start)
	assert.ok(quote >= 0, `${key} is not a single-quoted scalar`)
	let value = ''
	let pendingBreak = false
	for (let index = quote + 1; index < source.length; index += 1) {
		const char = source[index]
		if (char === "'" && source[index + 1] === "'") {
			if (pendingBreak) {
				value += ' '
				pendingBreak = false
			}
			value += "'"
			index += 1
			continue
		}
		if (char === "'") return value
		if (char === '\n') {
			pendingBreak = true
			while (source[index + 1] === ' ' || source[index + 1] === '\t') index += 1
			continue
		}
		if (pendingBreak) {
			value += ' '
			pendingBreak = false
		}
		value += char
	}
	throw new Error(`${key} string did not end`)
}

function at(minutes) {
	return new Date(Date.parse(NOW) + minutes * 60 * 1000).toISOString()
}

function successRun(overrides = {}) {
	return {
		sha: SHA,
		name: '✅ Validate',
		status: 'completed',
		conclusion: 'success',
		attempt: 1,
		createdAt: at(-20),
		updatedAt: at(-10),
		...overrides,
	}
}

function passComment(sha = SHA, minutes = -5) {
	return {
		body: `<!-- factory-review: verdict=pass sha=${sha} -->`,
		at: at(minutes),
	}
}

function passReview(sha = SHA, minutes = -5, overrides = {}) {
	return {
		body: `<!-- factory-review: verdict=pass sha=${sha} -->`,
		at: at(minutes),
		author: 'cameron-nye',
		state: 'commented',
		edited: false,
		...overrides,
	}
}

function pull(overrides = {}) {
	return {
		number: 22,
		state: 'open',
		draft: false,
		author: 'cameron-nye',
		base: 'main',
		headRef: 'cursor/example',
		headSha: SHA,
		headRepo: 'cameron-nye/rhino',
		repo: 'cameron-nye/rhino',
		title: 'Ship the change',
		body: 'No device work.',
		labels: [],
		files: [{ filename: 'docs/guides/x.md', status: 'modified' }],
		packageJsons: [],
		reviews: [passReview()],
		comments: [],
		linkedIssueBodies: [],
		...overrides,
	}
}

function decide(overrides = {}) {
	return evaluate({
		config,
		now: overrides.now ?? NOW,
		commitAt: overrides.commitAt ?? at(-20),
		runs: overrides.runs ?? [successRun()],
		pr: pull(overrides.pr),
	})
}

test('happy path merges cursor/*, factory/*, and habits/issue-* branches', () => {
	assert.equal(decide().decision, 'merge')
	assert.equal(decide({ pr: { headRef: 'cursor/agent-1' } }).decision, 'merge')
	assert.equal(decide({ pr: { headRef: 'factory/nightly' } }).decision, 'merge')
	assert.equal(decide({ pr: { headRef: 'habits/issue-18' } }).decision, 'merge')
})

test('ignores draft, fork, author, base, branch, and closed', () => {
	const cases = [
		['draft', { draft: true }],
		['fork', { headRepo: 'other/rhino' }],
		['author', { author: 'octocat' }],
		['base', { base: 'develop' }],
		['branch', { headRef: 'feature/thing' }],
		['closed', { state: 'closed' }],
	]
	for (const [name, patch] of cases) {
		assert.equal(decide({ pr: patch }).decision, 'ignore', name)
	}
	assert.equal(decide({ pr: { headRepo: '' } }).decision, 'ignore')
})

test('CI failure gives failed', () => {
	const result = decide({
		runs: [successRun({ conclusion: 'failure', updatedAt: at(-1) })],
	})
	assert.equal(result.decision, 'failed')
	assert.deepEqual(result.reasons, ['CI failure'])
})

test('cancelled, skipped, neutral, and stale never pass', () => {
	for (const conclusion of ['cancelled', 'skipped', 'neutral', 'stale']) {
		const result = decide({
			runs: [successRun({ conclusion, updatedAt: at(-1) })],
		})
		assert.equal(result.decision, 'failed', conclusion)
		assert.match(result.reasons[0], new RegExp(conclusion))
	}
})

test('queued and in_progress CI waits, then goes stuck after 60 minutes', () => {
	for (const status of ['queued', 'in_progress']) {
		const waiting = decide({
			runs: [successRun({ status, conclusion: null, createdAt: at(-10) })],
		})
		assert.equal(waiting.decision, 'wait', status)
		const stuck = decide({
			runs: [successRun({ status, conclusion: null, createdAt: at(-61) })],
		})
		assert.equal(stuck.decision, 'stuck', status)
	}
	assert.equal(
		decide({
			runs: [
				successRun({ status: 'queued', conclusion: null, createdAt: at(-60) }),
			],
		}).decision,
		'stuck',
	)
})

test('CI on another SHA is ignored and the first run timestamp wins over the commit date', () => {
	const other = successRun({ sha: OTHER, createdAt: at(-5) })
	assert.equal(decide({ runs: [other], commitAt: at(-5) }).decision, 'wait')
	assert.equal(decide({ runs: [other], commitAt: at(-90) }).decision, 'stuck')
	const preview = successRun({
		name: '🔎 Preview',
		createdAt: at(-5),
		conclusion: 'success',
	})
	assert.equal(decide({ runs: [preview] }).decision, 'wait')
	const recentQueued = successRun({
		status: 'queued',
		conclusion: null,
		createdAt: at(-5),
	})
	assert.equal(
		decide({ runs: [recentQueued], commitAt: at(-500) }).decision,
		'wait',
	)
})

test('the latest CI attempt wins', () => {
	const failed = successRun({
		conclusion: 'failure',
		attempt: 1,
		updatedAt: at(-30),
	})
	const passed = successRun({
		conclusion: 'success',
		attempt: 2,
		updatedAt: at(-5),
	})
	assert.equal(decide({ runs: [failed, passed] }).decision, 'merge')
	assert.equal(
		decide({
			runs: [
				passed,
				successRun({ conclusion: 'failure', attempt: 3, updatedAt: at(-1) }),
			],
		}).decision,
		'failed',
	)
	assert.equal(
		decide({
			runs: [
				successRun({ conclusion: 'success', attempt: 1, updatedAt: at(-30) }),
				successRun({ conclusion: 'failure', attempt: 1, updatedAt: at(-1) }),
			],
		}).decision,
		'failed',
	)
})

test('an older failed CI run does not outrank a newer success', () => {
	const newerSuccess = successRun({
		conclusion: 'success',
		attempt: 1,
		createdAt: at(-5),
		updatedAt: at(-5),
	})
	const olderFailure = successRun({
		conclusion: 'failure',
		attempt: 2,
		createdAt: at(-40),
		updatedAt: at(-1),
	})
	assert.equal(decide({ runs: [newerSuccess, olderFailure] }).decision, 'merge')
	assert.equal(decide({ runs: [olderFailure, newerSuccess] }).decision, 'merge')
	assert.equal(
		decide({
			runs: [
				successRun({
					conclusion: 'success',
					attempt: 2,
					createdAt: at(-40),
					updatedAt: at(-30),
				}),
				successRun({
					conclusion: 'failure',
					attempt: 1,
					createdAt: at(-5),
					updatedAt: at(-5),
				}),
			],
		}).decision,
		'failed',
	)
})

test('a verdict for an older SHA is ignored and no verdict goes stuck after 60 minutes', () => {
	const older = [passReview(OTHER, -5)]
	assert.equal(decide({ pr: { reviews: older } }).decision, 'wait')
	assert.equal(
		decide({
			pr: { reviews: older },
			runs: [successRun({ createdAt: at(-61) })],
		}).decision,
		'stuck',
	)
	assert.equal(
		decide({
			pr: { reviews: [] },
			runs: [successRun({ createdAt: at(-61) })],
		}).decision,
		'stuck',
	)
})

test('a verdict of fail gives failed and the latest marker for the head SHA wins', () => {
	const fail = {
		body: `<!-- factory-review: verdict=fail sha=${SHA} -->`,
		at: at(-1),
		author: 'cameron-nye',
		state: 'changes_requested',
		edited: false,
	}
	const failed = decide({ pr: { reviews: [fail] } })
	assert.equal(failed.decision, 'failed')
	assert.ok(failed.reasons.includes('verdict fail'))
	const olderFail = {
		body: `<!-- factory-review: verdict=fail sha=${SHA} -->`,
		at: at(-20),
		author: 'cameron-nye',
		state: 'changes_requested',
		edited: false,
	}
	assert.equal(
		decide({ pr: { reviews: [olderFail, passReview(SHA, -1)] } }).decision,
		'merge',
	)
	assert.equal(
		decide({ pr: { reviews: [passReview(SHA, -20), fail] } }).decision,
		'failed',
	)
})

test('a pass marker from another user or from an issue comment is ignored', () => {
	assert.equal(
		decide({
			pr: { reviews: [passReview(SHA, -5, { author: 'octocat' })] },
		}).decision,
		'wait',
	)
	assert.equal(
		decide({
			pr: {
				reviews: [],
				comments: [passComment()],
			},
		}).decision,
		'wait',
	)
	assert.equal(
		decide({
			pr: { reviews: [passReview(SHA, -5, { state: 'dismissed' })] },
		}).decision,
		'wait',
	)
	assert.equal(
		decide({
			pr: { reviews: [passReview(SHA, -5, { state: 'pending' })] },
		}).decision,
		'wait',
	)
	assert.equal(
		decide({
			pr: { reviews: [passReview(SHA, -5, { edited: true })] },
		}).decision,
		'wait',
	)
	assert.equal(
		decide({
			pr: {
				reviews: [
					passReview(SHA, -5, { author: 'octocat' }),
					passReview(SHA, -1),
				],
			},
		}).decision,
		'merge',
	)
})

test('an incomplete lookup waits, then goes stuck after 60 minutes', () => {
	const waiting = decide({ pr: { lookupIncomplete: true } })
	assert.equal(waiting.decision, 'wait')
	assert.deepEqual(waiting.reasons, ['lookup incomplete'])
	assert.equal(waiting.discordState, null)
	const stuck = decide({
		pr: { lookupIncomplete: true },
		runs: [successRun({ createdAt: at(-61) })],
	})
	assert.equal(stuck.decision, 'stuck')
	assert.deepEqual(stuck.reasons, ['lookup incomplete'])
	assert.equal(stuck.discordState, 'stuck')
	assert.equal(
		decide({
			pr: { lookupIncomplete: true, labels: ['no-automerge'] },
		}).decision,
		'wait',
	)
})

test('the fix-up label waits and goes stuck when it is older than 4 hours', () => {
	const fresh = decide({
		pr: {
			labels: ['factory-fixup-running'],
			fixupLabelAddedAt: at(-239),
		},
	})
	assert.equal(fresh.decision, 'wait')
	const exact = decide({
		pr: {
			labels: ['factory-fixup-running'],
			fixupLabelAddedAt: at(-240),
		},
	})
	assert.equal(exact.decision, 'wait')
	const stale = decide({
		pr: {
			labels: ['factory-fixup-running'],
			fixupLabelAddedAt: at(-241),
		},
	})
	assert.equal(stale.decision, 'stuck')
	assert.deepEqual(stale.reasons, ['fixup stale'])
})

test('no-automerge gives ready only after green CI and a passing review', () => {
	assert.equal(
		decide({ pr: { labels: ['no-automerge'], reviews: [] } }).decision,
		'wait',
	)
	assert.equal(
		decide({
			pr: { labels: ['no-automerge'] },
			runs: [],
			commitAt: at(-5),
		}).decision,
		'wait',
	)
	const result = decide({
		pr: { labels: ['no-automerge'] },
	})
	assert.equal(result.decision, 'ready')
	assert.deepEqual(result.reasons, ['no-automerge'])
})


test('manual reasons wait for a passing review on the current head SHA', () => {
	const filename =
		(config.__mustBeManual && config.__mustBeManual[0]) ||
		'.github/workflows/automerge.yml'
	const files = [{ filename, status: 'modified' }]
	assert.equal(decide({ pr: { files, reviews: [] } }).decision, 'wait')
	assert.equal(
		decide({
			pr: { files, reviews: [] },
			runs: [successRun({ createdAt: at(-61) })],
		}).decision,
		'stuck',
	)
	const fail = {
		body: `<!-- factory-review: verdict=fail sha=${SHA} -->`,
		at: at(-1),
		author: 'cameron-nye',
		state: 'changes_requested',
		edited: false,
	}
	assert.equal(decide({ pr: { files, reviews: [fail] } }).decision, 'failed')
	assert.equal(decide({ pr: { files } }).decision, 'ready')
})

test('a 300-file pull request still merges', () => {
	const files = Array.from({ length: 300 }, (_, index) => ({
		filename: `docs/guides/f${index}.md`,
		status: 'modified',
	}))
	assert.equal(decide({ pr: { files } }).decision, 'merge')
})

test('every __mustBeManual path gives ready and every __mustBeAuto path merges', () => {
	for (const filename of config.__mustBeManual) {
		const result = decide({ pr: { files: [{ filename, status: 'modified' }] } })
		assert.equal(result.decision, 'ready', filename)
		assert.ok(
			result.reasons.includes(`manual path ${filename}`),
			result.reasons.join(', '),
		)
	}
	for (const filename of config.__mustBeAuto) {
		assert.equal(
			decide({ pr: { files: [{ filename, status: 'modified' }] } }).decision,
			'merge',
			filename,
		)
	}
})

test('a rename from a manual path gives ready', () => {
	const result = decide({
		pr: {
			files: [
				{
					filename: 'docs/guides/x.md',
					previous_filename: 'packages/worker/src/billing/x.ts',
					status: 'renamed',
				},
			],
		},
	})
	assert.equal(result.decision, 'ready')
	assert.ok(
		result.reasons.includes('manual path packages/worker/src/billing/x.ts'),
	)
})

test('fixture paths and added sensitive directories exist', () => {
	for (const file of [...config.__mustBeManual, ...config.__mustBeAuto]) {
		assert.equal(existsSync(dirname(join(root, file))), true, file)
	}
	for (const dir of [
		'packages/worker/src/api-tokens',
		'packages/worker/src/webhooks',
		'packages/worker/src/mcp/capabilities/webhooks',
		'packages/worker/src/security',
		'packages/worker/src/billing',
		'packages/worker/src/authorization',
		'packages/worker/src/secrets',
		'packages/worker/src/oauth-device',
		'packages/worker/src/credentials',
		'packages/worker/migrations',
		'patches',
		'packages/shared/src',
	]) {
		assert.equal(existsSync(join(root, dir)), true, dir)
	}
	for (const file of [
		'packages/worker/src/oauth-handlers.ts',
		'packages/worker/src/mcp-auth.ts',
		'packages/worker/src/app/handlers/auth.ts',
		'packages/worker/src/app/handlers/auth-provider.ts',
		'packages/worker/src/app/handlers/stripe-webhook.ts',
		'wrangler-env.ts',
	]) {
		assert.equal(existsSync(join(root, file)), true, file)
		assert.equal(
			decide({ pr: { files: [{ filename: file }] } }).decision,
			'ready',
			file,
		)
	}
})

test('device-test text in the pull request or a linked issue gives ready', () => {
	const body = decide({ pr: { body: 'Please run a device test' } })
	assert.equal(body.decision, 'ready')
	assert.ok(body.reasons.includes('device test'))
	const issue = decide({
		pr: { linkedIssueBodies: ['Reproduced in airplane mode'] },
	})
	assert.equal(issue.decision, 'ready')
	const clean = decide({
		pr: { body: 'Unit tests only', linkedIssueBodies: ['CI is enough'] },
	})
	assert.equal(clean.decision, 'merge')
})

test('new dependencies and major bumps are manual, including 0.x minor bumps', () => {
	function withPackages(before, after) {
		return decide({
			pr: { packageJsons: [{ path: 'package.json', before, after }] },
		})
	}
	const added = withPackages(
		{ dependencies: {} },
		{ dependencies: { leftpad: '1.0.0' } },
	)
	assert.equal(added.decision, 'ready')
	assert.ok(added.reasons.includes('new dependency leftpad'))
	const major = withPackages(
		{ dependencies: { lodash: '^1.2.3' } },
		{ dependencies: { lodash: '^2.0.0' } },
	)
	assert.equal(major.decision, 'ready')
	assert.match(major.reasons.join(' '), /major bump lodash/)
	assert.equal(
		withPackages(
			{ dependencies: { lodash: '1.2.3' } },
			{ dependencies: { lodash: '1.3.0' } },
		).decision,
		'merge',
	)
	assert.equal(
		withPackages(
			{ dependencies: { lodash: '1.2.3' } },
			{ dependencies: { lodash: '1.2.4' } },
		).decision,
		'merge',
	)
	assert.equal(
		withPackages(
			{ dependencies: { lib: '0.1.0' } },
			{ dependencies: { lib: '0.2.0' } },
		).decision,
		'ready',
	)
	assert.equal(
		withPackages(
			{ devDependencies: { lib: '0.1.0' } },
			{ devDependencies: { lib: '0.1.1' } },
		).decision,
		'merge',
	)
	assert.equal(
		withPackages(
			{ optionalDependencies: {} },
			{ optionalDependencies: { buffer: '6.0.0' } },
		).decision,
		'ready',
	)
	assert.equal(
		withPackages(
			{ peerDependencies: { react: '18.2.0' } },
			{ peerDependencies: { react: '19.0.0' } },
		).decision,
		'ready',
	)
})

test('the workflow config block equals the fixture config', () => {
	const workflow = readFileSync(
		join(root, '.github/workflows/automerge.yml'),
		'utf8',
	)
	assert.deepEqual(
		JSON.parse(readYamlSingleQuoted(workflow, 'AUTOMERGE_CONFIG')),
		config,
	)
	const signal = readFileSync(
		join(root, '.github/workflows/automerge-signal.yml'),
		'utf8',
	)
	assert.match(signal, /^permissions: \{\}$/m)
	assert.equal(signal.includes('actions/checkout'), false)
	assert.match(workflow, /permissions: \{\}/)
	assert.match(workflow, /persist-credentials: false/)
	assert.match(workflow, /sparse-checkout: \.github\/automerge/)
	assert.match(workflow, /github\.event\.repository\.default_branch/)
	assert.equal(workflow.includes('github.event.pull_request.head'), false)
	assert.equal(workflow.includes('Cursor Bugbot'), false)
	assert.equal(
		existsSync(join(root, '.github/workflows/rhino-automerge.yml')),
		false,
	)
	const source = readFileSync(join(root, '.github/automerge/run.js'), 'utf8')
	assert.equal(source.includes('discord.com'), false)
	assert.equal(source.includes(SECRET_MARK), false)
	assert.match(source, /DISCORD_WEBHOOK_PR_READY/)
	assert.match(source, /DISCORD_WEBHOOK_PR_MERGED/)
	assert.match(source, /merge_method: 'squash'/)
	assert.match(source, /workflow_id: 'deploy\.yml'/)
	assert.match(source, /workflow_id: 'preview\.yml'/)
	assert.match(source, /mode: 'production'/)
	assert.match(source, /action: 'cleanup'/)
	assert.match(source, /target: 'pr'/)
	assert.match(source, /state_reason: 'completed'/)
	assert.equal(source.includes('commit_title'), false)
	assert.equal(source.includes('commit_message'), false)
})

test('Discord titles drop @ and backticks', () => {
	const notice = buildNotice({
		state: 'ready',
		repo: 'cameron-nye/rhino',
		number: 22,
		title: 'Hi @here use `code`',
		url: 'https://github.com/cameron-nye/rhino/pull/22',
		reasons: ['no-automerge'],
	})
	assert.match(notice, /ready for Cameron/)
	assert.match(notice, /Hi here use code/)
	assert.equal(notice.includes('@'), false)
	assert.equal(notice.includes('`'), false)
})

let chain = Promise.resolve()
function exclusive(work) {
	const next = chain.then(work, work)
	chain = next.then(
		() => undefined,
		() => undefined,
	)
	return next
}

function githubPull(overrides = {}) {
	return {
		number: 22,
		state: 'open',
		draft: false,
		title: 'Ship @the `change`',
		body: 'Fixes #18',
		user: { login: 'cameron-nye' },
		labels: [],
		head: {
			ref: 'cursor/example',
			sha: SHA,
			repo: { full_name: 'cameron-nye/rhino' },
		},
		base: { ref: 'main', sha: OTHER },
		...overrides,
	}
}

function createHarness(options = {}) {
	const calls = []
	const logs = []
	const fetchBodies = []
	const consoleEvents = []
	let fetchCount = 0
	let fetchMatched = 0
	let prGetIndex = 0
	const pr = githubPull(options.pull)
	const comments = []
	const core = {
		info(message) {
			logs.push({ level: 'info', message: String(message) })
		},
		warning(message) {
			logs.push({ level: 'warning', message: String(message) })
		},
		error(message) {
			logs.push({ level: 'error', message: String(message) })
		},
		notice(message) {
			logs.push({ level: 'notice', message: String(message) })
		},
		debug(message) {
			logs.push({ level: 'debug', message: String(message) })
		},
		setOutput(name, value) {
			logs.push({ level: 'output', message: `${name}=${String(value)}` })
		},
	}
	const linkedPages = options.linkedPages ?? {
		'': {
			pageInfo: { hasNextPage: false, endCursor: null },
			nodes: [
				{
					number: 18,
					state: 'OPEN',
					body: '',
					repository: { nameWithOwner: 'cameron-nye/rhino' },
				},
			],
		},
	}
	async function request(route, params) {
		calls.push({ route, params })
		if (
			route.startsWith('GET /repos/{owner}/{repo}/pulls/{pull_number}/files')
		) {
			if (options.filesError) {
				throw Object.assign(new Error('files failed'), { status: 500 })
			}
			const data = options.files ?? [
				{ filename: 'docs/guides/x.md', status: 'modified' },
			]
			if (options.filesTruncated) {
				return {
					data,
					headers: {
						link: `<https://example.test?page=${params.page + 1}>; rel="next"`,
					},
				}
			}
			return { data, headers: {} }
		}
		if (
			route.startsWith('GET /repos/{owner}/{repo}/pulls/{pull_number}/comments')
		) {
			return { data: [], headers: {} }
		}
		if (
			route.startsWith('GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews')
		) {
			return {
				data: [
					{
						body: `<!-- factory-review: verdict=pass sha=${pr.head.sha} -->`,
						submitted_at: at(-5),
					},
				],
				headers: {},
			}
		}
		if (
			route.startsWith(
				'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
			)
		) {
			const data = [...comments]
			if (options.forgedMarker) {
				data.push({
					body: `<!-- automerge-notify: state=${options.forgedState ?? 'ready'} sha=${pr.head.sha} -->`,
					created_at: at(-1),
					user: { login: options.forgedAuthor ?? 'octocat' },
				})
			}
			if (options.commentVerdict) {
				data.push({
					body: `<!-- factory-review: verdict=pass sha=${pr.head.sha} -->`,
					created_at: at(-5),
					user: { login: 'cameron-nye' },
				})
			}
			return { data, headers: {} }
		}
		if (route === 'GET /repos/{owner}/{repo}/issues/{issue_number}/labels') {
			if (options.labelsError) {
				throw Object.assign(new Error('labels failed'), { status: 500 })
			}
			const data = pr.labels ?? []
			if (options.labelsTruncated) {
				return {
					data,
					headers: { link: '<https://example.test?page=2>; rel="next"' },
				}
			}
			return { data, headers: {} }
		}
		if (
			route.startsWith('GET /repos/{owner}/{repo}/issues/{issue_number}/events')
		) {
			if (options.eventsError) {
				throw Object.assign(new Error('events failed'), { status: 500 })
			}
			if (options.eventsTruncated) {
				return {
					data: options.events ?? [],
					headers: { link: '<https://example.test?page=2>; rel="next"' },
				}
			}
			return { data: options.events ?? [], headers: {} }
		}
		if (
			route === 'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs'
		) {
			return { data: { workflow_runs: options.deployRuns ?? [] }, headers: {} }
		}
		if (route === 'GET /repos/{owner}/{repo}/actions/runs') {
			if (options.runsError) {
				throw Object.assign(new Error('runs failed'), { status: 500 })
			}
			const workflowRuns = options.workflowRuns ?? [
				{
					name: '✅ Validate',
					head_sha: pr.head.sha,
					status: 'completed',
					conclusion: 'success',
					run_attempt: 1,
					created_at: at(-20),
					updated_at: at(-10),
				},
			]
			if (options.runsTruncated) {
				return {
					data: { workflow_runs: workflowRuns },
					headers: { link: '<https://example.test?page=2>; rel="next"' },
				}
			}
			return { data: { workflow_runs: workflowRuns }, headers: {} }
		}
		if (route === 'GET /repos/{owner}/{repo}/commits/{ref}') {
			if (options.commitError) {
				throw Object.assign(new Error('commit failed'), { status: 500 })
			}
			return {
				data: {
					commit: { committer: { date: options.commitAt ?? at(-20) } },
				},
				headers: {},
			}
		}
		if (route.startsWith('GET /repos/{owner}/{repo}/contents/')) {
			if (options.contentsError) {
				throw Object.assign(new Error('contents failed'), { status: 500 })
			}
			throw Object.assign(new Error('Not Found'), { status: 404 })
		}
		if (route === 'POST /graphql') {
			const query = String(params.query ?? '')
			if (query.includes('reviews(')) {
				if (options.reviewsError) {
					throw Object.assign(new Error('reviews failed'), { status: 500 })
				}
				const review = {
					author: { login: options.reviewAuthor ?? 'cameron-nye' },
					body: options.noReview
						? ''
						: `<!-- factory-review: verdict=pass sha=${pr.head.sha} -->`,
					state: options.reviewState ?? 'COMMENTED',
					submittedAt: at(-5),
					lastEditedAt: options.reviewEdited ? at(-1) : null,
				}
				if (options.reviewsTruncated) {
					const cursor = params.variables?.cursor ?? 'start'
					return {
						data: {
							data: {
								repository: {
									pullRequest: {
										reviews: {
											pageInfo: {
												hasNextPage: true,
												endCursor: `review-${cursor}`,
											},
											nodes: options.noReview ? [] : [review],
										},
									},
								},
							},
						},
						headers: {},
					}
				}
				return {
					data: {
						data: {
							repository: {
								pullRequest: {
									reviews: {
										pageInfo: { hasNextPage: false, endCursor: null },
										nodes: options.noReview ? [] : [review],
									},
								},
							},
						},
					},
					headers: {},
				}
			}
			if (options.graphqlError) {
				throw Object.assign(new Error('graphql failed'), { status: 500 })
			}
			const cursor = params.variables?.cursor
			const key = cursor == null || cursor === '' ? '' : String(cursor)
			if (options.linkedTruncated) {
				return {
					data: {
						data: {
							repository: {
								pullRequest: {
									closingIssuesReferences: {
										pageInfo: {
											hasNextPage: true,
											endCursor: `linked-${key || 'start'}`,
										},
										nodes: [],
									},
								},
							},
						},
					},
					headers: {},
				}
			}
			const page = linkedPages[key]
			if (!page) throw Object.assign(new Error('missing page'), { status: 500 })
			return {
				data: {
					data: {
						repository: { pullRequest: { closingIssuesReferences: page } },
					},
				},
				headers: {},
			}
		}
		if (route === 'GET /repos/{owner}/{repo}/pulls/{pull_number}') {
			return { data: pr, headers: {} }
		}
		if (route === 'GET /repos/{owner}/{repo}/pulls') {
			return { data: pr.state === 'open' ? [pr] : [], headers: {} }
		}
		if (route === 'PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge') {
			if (options.mergeStatus) {
				throw Object.assign(new Error('refused'), {
					status: options.mergeStatus,
				})
			}
			pr.state = 'closed'
			return {
				data: { merged: true, sha: options.mergeSha ?? MERGE },
				headers: {},
			}
		}
		if (route === 'PATCH /repos/{owner}/{repo}/issues/{issue_number}') {
			if (options.patchFail) {
				throw Object.assign(new Error('nope'), { status: 500 })
			}
			return { data: { state: 'closed' }, headers: {} }
		}
		if (route === 'POST /repos/{owner}/{repo}/issues/{issue_number}/comments') {
			comments.push({
				body: params.body,
				created_at: NOW,
				user: { login: 'github-actions[bot]' },
			})
			return { data: { id: comments.length }, headers: {} }
		}
		if (
			route ===
			'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches'
		) {
			if (params.workflow_id === 'preview.yml' && options.previewFail) {
				throw Object.assign(new Error('preview failed'), { status: 500 })
			}
			return { data: {}, headers: {} }
		}
		throw new Error(`unexpected route ${route}`)
	}
	const previousFetch = globalThis.fetch
	const originals = {}
	for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
		originals[method] = console[method]
		console[method] = (...args) => {
			consoleEvents.push(args.map((arg) => String(arg)).join(' '))
		}
	}
	globalThis.fetch = async (url, init) => {
		fetchCount += 1
		if (
			url === process.env.DISCORD_WEBHOOK_PR_READY ||
			url === process.env.DISCORD_WEBHOOK_PR_MERGED
		) {
			fetchMatched += 1
		}
		fetchBodies.push(String(init?.body ?? ''))
		if (options.fetchThrow) throw new Error(`connect failed ${url}`)
		return { status: options.fetchStatus ?? 200 }
	}
	async function pullsGet(params) {
		if (Array.isArray(options.prGetSeq)) {
			const next =
				prGetIndex < options.prGetSeq.length
					? options.prGetSeq[prGetIndex]
					: null
			prGetIndex += 1
			calls.push({ route: 'pulls.get', params })
			if (next == null || next instanceof Error) {
				throw next instanceof Error
					? next
					: Object.assign(new Error('re-read failed'), { status: 500 })
			}
			return { data: next }
		}
		return request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
			owner: params.owner,
			repo: params.repo,
			pull_number: params.pull_number,
		})
	}
	async function pullsMerge(params) {
		return request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
			owner: params.owner,
			repo: params.repo,
			pull_number: params.pull_number,
			merge_method: params.merge_method,
			sha: params.sha,
		})
	}
	return {
		github: { request, rest: { pulls: { get: pullsGet, merge: pullsMerge } } },
		context: { repo: { owner: 'cameron-nye', repo: 'rhino' } },
		core,
		calls,
		logs,
		comments,
		pr,
		fetchBodies,
		stats: () => ({ fetchCount, fetchMatched }),
		blob: () =>
			JSON.stringify({ calls, logs, comments, fetchBodies, consoleEvents }),
		restore() {
			globalThis.fetch = previousFetch
			for (const method of Object.keys(originals)) {
				console[method] = originals[method]
			}
		},
	}
}

async function withSecrets(work, secrets = {}) {
	const previous = {
		AUTOMERGE_CONFIG: process.env.AUTOMERGE_CONFIG,
		DISCORD_WEBHOOK_PR_READY: process.env.DISCORD_WEBHOOK_PR_READY,
		DISCORD_WEBHOOK_PR_MERGED: process.env.DISCORD_WEBHOOK_PR_MERGED,
	}
	process.env.AUTOMERGE_CONFIG = JSON.stringify(config)
	const ready = 'ready' in secrets ? secrets.ready : READY_SECRET
	const merged = 'merged' in secrets ? secrets.merged : MERGED_SECRET
	if (ready == null) delete process.env.DISCORD_WEBHOOK_PR_READY
	else process.env.DISCORD_WEBHOOK_PR_READY = ready
	if (merged == null) delete process.env.DISCORD_WEBHOOK_PR_MERGED
	else process.env.DISCORD_WEBHOOK_PR_MERGED = merged
	try {
		return await work()
	} finally {
		for (const [key, value] of Object.entries(previous)) {
			if (value == null) delete process.env[key]
			else process.env[key] = value
		}
	}
}

async function execute(options) {
	const harness = createHarness(options)
	try {
		const result = await run({
			github: harness.github,
			context: harness.context,
			core: harness.core,
			now: options.now ?? NOW,
		})
		return {
			result,
			calls: harness.calls,
			logs: harness.logs,
			comments: harness.comments,
			fetchBodies: harness.fetchBodies,
			stats: harness.stats(),
			blob: harness.blob(),
		}
	} finally {
		harness.restore()
	}
}

function assertNoSecret(blob) {
	assert.equal(blob.includes(SECRET_MARK), false)
	assert.equal(blob.includes('hooks.example'), false)
}

function dispatch(calls, workflowId, method) {
	return calls.filter(
		(call) =>
			call.route.startsWith(method) && call.params?.workflow_id === workflowId,
	)
}

test('run.js squash-merges the pinned SHA, closes the linked issue, and dispatches', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			const outcome = await execute({
				linkedPages: {
					'': {
						pageInfo: { hasNextPage: true, endCursor: 'p2' },
						nodes: [
							{
								number: 18,
								state: 'OPEN',
								body: '',
								repository: { nameWithOwner: 'cameron-nye/rhino' },
							},
							{
								number: 23,
								state: 'CLOSED',
								body: '',
								repository: { nameWithOwner: 'cameron-nye/rhino' },
							},
							{
								number: 7,
								state: 'OPEN',
								body: '',
								repository: { nameWithOwner: 'octo-org/octo-repo' },
							},
							{
								number: 'nope',
								state: 'OPEN',
								body: '',
								repository: { nameWithOwner: 'cameron-nye/rhino' },
							},
						],
					},
					p2: {
						pageInfo: { hasNextPage: false, endCursor: null },
						nodes: [
							{
								number: 24,
								state: 'open',
								body: '',
								repository: { nameWithOwner: 'cameron-nye/rhino' },
							},
						],
					},
				},
			})
			assert.deepEqual(outcome.result.merged, [22])
			const merge = outcome.calls.find((call) => call.route.startsWith('PUT '))
			assert.equal(merge.params.sha, SHA)
			assert.equal(merge.params.merge_method, 'squash')
			assert.equal(merge.params.commit_title, undefined)
			assert.equal(merge.params.commit_message, undefined)
			const patches = outcome.calls.filter((call) =>
				call.route.startsWith('PATCH '),
			)
			assert.deepEqual(
				patches.map((call) => call.params.issue_number),
				[18, 24],
			)
			for (const call of patches) {
				assert.equal(call.params.state, 'closed')
				assert.equal(call.params.state_reason, 'completed')
			}
			assert.equal(outcome.stats.fetchCount, 1)
			assert.equal(outcome.stats.fetchMatched, 1)
			const body = JSON.parse(outcome.fetchBodies[0])
			assert.deepEqual(body.allowed_mentions, { parse: [] })
			assert.match(body.content, /auto-merged/)
			assert.match(body.content, /cameron-nye\/rhino/)
			assert.match(body.content, /#22 Ship the change/)
			assert.match(
				body.content,
				/https:\/\/github.com\/cameron-nye\/rhino\/pull\/22/,
			)
			assert.equal(body.content.includes('@'), false)
			assert.equal(body.content.includes('`'), false)
			const preview = dispatch(outcome.calls, 'preview.yml', 'POST ')
			assert.equal(preview.length, 1)
			assert.equal(preview[0].params.ref, 'main')
			assert.deepEqual(preview[0].params.inputs, {
				action: 'cleanup',
				target: 'pr',
				pr_number: '22',
			})
			const deploy = dispatch(outcome.calls, 'deploy.yml', 'POST ')
			assert.equal(deploy.length, 1)
			assert.equal(deploy[0].params.ref, 'main')
			assert.deepEqual(deploy[0].params.inputs, { mode: 'production' })
			const deployReads = dispatch(outcome.calls, 'deploy.yml', 'GET ')
			assert.equal(deployReads.length, 1)
			assert.equal(deployReads[0].params.event, 'workflow_dispatch')
			assert.equal(deployReads[0].params.head_sha, MERGE)
			assert.equal(deployReads[0].params.per_page, 5)
			assert.match(
				outcome.comments[0].body,
				/state=merged sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/,
			)
			assertNoSecret(outcome.blob)
		}),
	)
})

test('alreadyNotified trusts only a github-actions[bot] marker', () => {
	const marker = notifyMarker('ready', SHA)
	const ignored = [
		{ body: marker, user: { login: 'cameron-nye' } },
		{ body: marker, user: { login: 'octocat' } },
		{ body: marker },
		{ body: marker, user: { login: 'github-actions' } },
		marker,
	]
	for (const comment of ignored) {
		assert.equal(alreadyNotified([comment], 'ready', SHA), false)
	}
	assert.equal(
		alreadyNotified(
			[{ body: marker, user: { login: NOTIFY_LOGIN } }],
			'ready',
			SHA,
		),
		true,
	)
	assert.equal(NOTIFY_LOGIN, 'github-actions[bot]')
})

test('preMergeCheck refuses a changed pull request or a failed re-read', () => {
	const fresh = {
		head: { sha: SHA },
		state: 'open',
		draft: false,
		labels: [],
	}
	assert.equal(preMergeCheck(config, SHA, fresh), null)
	assert.equal(preMergeCheck(config, SHA, null), 're-read failed')
	assert.equal(
		preMergeCheck(config, SHA, { ...fresh, head: { sha: OTHER } }),
		'head changed',
	)
	assert.equal(
		preMergeCheck(config, SHA, { ...fresh, state: 'closed' }),
		'not open',
	)
	assert.equal(preMergeCheck(config, SHA, { ...fresh, draft: true }), 'draft')
	assert.equal(
		preMergeCheck(config, SHA, {
			...fresh,
			labels: [{ name: 'no-automerge' }],
		}),
		'no-automerge',
	)
	assert.equal(
		preMergeCheck(config, SHA, {
			...fresh,
			labels: [{ name: 'factory-fixup-running' }],
		}),
		'factory-fixup-running',
	)
})

test('one Discord post per pull request, SHA, and state', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			const harness = createHarness({
				pull: { labels: [{ name: 'no-automerge' }] },
			})
			try {
				const first = await run({
					github: harness.github,
					context: harness.context,
					core: harness.core,
				})
				const second = await run({
					github: harness.github,
					context: harness.context,
					core: harness.core,
				})
				assert.deepEqual(first.merged, [])
				assert.deepEqual(second.merged, [])
				assert.equal(harness.stats().fetchCount, 1)
				assert.equal(harness.comments.length, 1)
				assert.equal(harness.comments[0].user.login, NOTIFY_LOGIN)
				assert.match(harness.comments[0].body, /state=ready sha=/)
				assertNoSecret(harness.blob())
			} finally {
				harness.restore()
			}
		}),
	)
})

test('a missing Discord secret only warns and still writes the marker', async () => {
	await exclusive(() =>
		withSecrets(
			async () => {
				const outcome = await execute({
					pull: { labels: [{ name: 'no-automerge' }] },
				})
				assert.deepEqual(outcome.result.merged, [])
				assert.equal(outcome.stats.fetchCount, 0)
				assert.ok(
					outcome.logs.some(
						(entry) =>
							entry.level === 'warning' && entry.message.includes('missing'),
					),
				)
				assert.match(outcome.comments[0].body, /Discord: skipped/)
				assert.match(outcome.comments[0].body, /state=ready /)
				assert.equal(
					outcome.logs.some((entry) => entry.level === 'error'),
					false,
				)
				assertNoSecret(outcome.blob)
			},
			{ ready: null, merged: null },
		),
	)
})

test('a Discord failure does not write the marker and a thrown URL is not logged', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			const refused = await execute({
				pull: { labels: [{ name: 'no-automerge' }] },
				fetchStatus: 503,
			})
			assert.equal(refused.comments.length, 0)
			assert.ok(
				refused.logs.some((entry) => entry.message.includes('HTTP 503')),
			)
			assertNoSecret(refused.blob)
			const thrown = await execute({ fetchThrow: true })
			assert.deepEqual(thrown.result.merged, [22])
			assert.equal(thrown.comments.length, 0)
			assert.ok(
				thrown.logs.some((entry) =>
					entry.message.includes('failed before a response'),
				),
			)
			assertNoSecret(thrown.blob)
		}),
	)
})

test('deploy is skipped when that merge SHA is already queued or successful', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			for (const deployRuns of [
				[{ status: 'completed', conclusion: 'success' }],
				[{ status: 'queued', conclusion: null }],
			]) {
				const outcome = await execute({ deployRuns })
				assert.deepEqual(outcome.result.merged, [22])
				assert.equal(dispatch(outcome.calls, 'deploy.yml', 'POST ').length, 0)
				assert.equal(dispatch(outcome.calls, 'preview.yml', 'POST ').length, 1)
				assert.ok(
					outcome.logs.some((entry) =>
						entry.message.includes('already queued or succeeded'),
					),
				)
				assertNoSecret(outcome.blob)
			}
		}),
	)
})

test('a failed preview dispatch or linked-issue close does not undo the merge', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			const preview = await execute({ previewFail: true })
			assert.deepEqual(preview.result.merged, [22])
			assert.equal(dispatch(preview.calls, 'deploy.yml', 'POST ').length, 1)
			assert.ok(
				preview.logs.some((entry) =>
					entry.message.includes('The squash merge stands.'),
				),
			)
			const closed = await execute({ patchFail: true })
			assert.deepEqual(closed.result.merged, [22])
			assert.ok(
				closed.logs.some((entry) =>
					entry.message.includes('Failed to close #18'),
				),
			)
		}),
	)
})

function mergedCount(outcome) {
	return outcome.calls.filter((call) => call.route.startsWith('PUT ')).length
}

test('a pass marker from another user or an issue comment does not merge', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			const otherUser = await execute({ reviewAuthor: 'octocat' })
			assert.equal(mergedCount(otherUser), 0)
			assert.ok(
				otherUser.logs.some((entry) => entry.message.includes('#22 wait')),
			)
			assertNoSecret(otherUser.blob)
			const comment = await execute({ noReview: true, commentVerdict: true })
			assert.equal(mergedCount(comment), 0)
			assert.ok(
				comment.logs.some((entry) => entry.message.includes('#22 wait')),
			)
			assertNoSecret(comment.blob)
			const edited = await execute({ reviewEdited: true })
			assert.equal(mergedCount(edited), 0)
			const dismissed = await execute({ reviewState: 'DISMISSED' })
			assert.equal(mergedCount(dismissed), 0)
		}),
	)
})

test('a failed or truncated eligibility lookup does not merge', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			const cases = [
				{ filesError: true },
				{ filesTruncated: true },
				{ runsError: true },
				{ runsTruncated: true },
				{ reviewsError: true },
				{ reviewsTruncated: true },
				{ labelsError: true },
				{ labelsTruncated: true },
				{ eventsError: true },
				{ eventsTruncated: true },
				{ graphqlError: true },
				{ linkedTruncated: true },
				{
					contentsError: true,
					files: [{ filename: 'package.json', status: 'modified' }],
				},
			]
			for (const options of cases) {
				const outcome = await execute(options)
				assert.equal(mergedCount(outcome), 0, JSON.stringify(options))
				assert.equal(outcome.result.merged.length, 0, JSON.stringify(options))
				assert.ok(
					outcome.logs.some((entry) =>
						entry.message.includes('lookup incomplete'),
					),
					JSON.stringify(options),
				)
				assert.ok(
					outcome.logs.some((entry) => entry.message.includes('#22 wait')),
					JSON.stringify(options),
				)
				assertNoSecret(outcome.blob)
			}
			const stuck = await execute({
				filesError: true,
				workflowRuns: [
					{
						name: '✅ Validate',
						head_sha: SHA,
						status: 'completed',
						conclusion: 'success',
						run_attempt: 1,
						created_at: at(-61),
						updated_at: at(-1),
					},
				],
			})
			assert.equal(mergedCount(stuck), 0)
			assert.ok(stuck.logs.some((entry) => entry.message.includes('#22 stuck')))
			assert.equal(stuck.stats.fetchCount, 1)
			assertNoSecret(stuck.blob)
			const pages = await execute({ filesTruncated: true })
			const filePages = pages.calls.filter((call) =>
				call.route.startsWith(
					'GET /repos/{owner}/{repo}/pulls/{pull_number}/files',
				),
			)
			assert.equal(filePages.length, LOOKUP_PAGE_LIMIT)
		}),
	)
})

test('a forged automerge-notify marker does not suppress the notice', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			const harness = createHarness({
				pull: { labels: [{ name: 'no-automerge' }] },
				forgedMarker: true,
			})
			try {
				await run({
					github: harness.github,
					context: harness.context,
					core: harness.core,
					now: NOW,
				})
				assert.equal(harness.stats().fetchCount, 1)
				assert.equal(harness.comments.length, 1)
				assert.equal(harness.comments[0].user.login, NOTIFY_LOGIN)
				assert.match(harness.comments[0].body, /state=ready /)
				await run({
					github: harness.github,
					context: harness.context,
					core: harness.core,
					now: NOW,
				})
				assert.equal(harness.stats().fetchCount, 1)
				assert.equal(harness.comments.length, 1)
				assertNoSecret(harness.blob())
			} finally {
				harness.restore()
			}
		}),
	)
})

test('a label, a moved head, or a failed re-read blocks the merge', async () => {
	await exclusive(() =>
		withSecrets(async () => {
			const open = {
				state: 'open',
				draft: false,
				head: { sha: SHA },
				labels: [],
			}
			const cases = [
				{
					prGetSeq: [{ ...open, labels: [{ name: 'no-automerge' }] }],
					reason: 'no-automerge',
				},
				{
					prGetSeq: [{ ...open, labels: [{ name: 'factory-fixup-running' }] }],
					reason: 'factory-fixup-running',
				},
				{
					prGetSeq: [{ ...open, draft: true }],
					reason: 'draft',
				},
				{
					prGetSeq: [{ ...open, state: 'closed' }],
					reason: 'not open',
				},
				{
					prGetSeq: [{ ...open, head: { sha: OTHER } }],
					reason: 'head changed',
				},
				{
					prGetSeq: [null],
					reason: 're-read failed',
				},
			]
			for (const options of cases) {
				const outcome = await execute(options)
				assert.equal(mergedCount(outcome), 0, options.reason)
				assert.equal(outcome.result.merged.length, 0, options.reason)
				assert.equal(
					outcome.calls.filter((call) => call.route.startsWith('PUT ')).length,
					0,
					options.reason,
				)
				assert.equal(
					dispatch(outcome.calls, 'deploy.yml', 'POST ').length,
					0,
					options.reason,
				)
				assert.equal(
					dispatch(outcome.calls, 'preview.yml', 'POST ').length,
					0,
					options.reason,
				)
				assert.ok(
					outcome.logs.some((entry) => entry.message.includes(options.reason)),
					options.reason,
				)
				assertNoSecret(outcome.blob)
			}
		}),
	)
})
