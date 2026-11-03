import { expect, test } from 'vitest'
import {
	buildStartupBundleOverageIssueBody,
	reportStartupBundleOverages,
	shouldReportStartupBundleOverageIssue,
	startupBundleOverageIssueMarker,
	startupBundleOverageIssueTitle,
	upsertStartupBundleOverageIssue,
} from './startup-bundle-overage-issue.ts'

test('issue reporting is limited to main CI pushes with a token', () => {
	expect(
		shouldReportStartupBundleOverageIssue({
			CI: '1',
			GITHUB_EVENT_NAME: 'push',
			GITHUB_REF: 'refs/heads/main',
			GH_TOKEN: 'token',
		}),
	).toBe(true)
	expect(
		shouldReportStartupBundleOverageIssue({
			CI: '1',
			GITHUB_EVENT_NAME: 'pull_request',
			GITHUB_REF: 'refs/heads/main',
			GH_TOKEN: 'token',
		}),
	).toBe(false)
	expect(
		shouldReportStartupBundleOverageIssue({
			CI: '1',
			GITHUB_EVENT_NAME: 'push',
			GITHUB_REF: 'refs/heads/main',
		}),
	).toBe(false)
})

test('upsertStartupBundleOverageIssue creates once then updates', () => {
	const calls: Array<Array<string>> = []
	let existing: { number: number; title: string; body: string } | null = null
	const gh = (args: Array<string>) => {
		calls.push(args)
		if (args[0] === 'issue' && args[1] === 'create') {
			existing = {
				number: 42,
				title: startupBundleOverageIssueTitle('runtime'),
				body: 'created',
			}
			return 'https://github.com/kody-hq/kody/issues/42\n'
		}
		return ''
	}
	const findOpen = () => existing
	const overage = {
		name: 'runtime' as const,
		size: 3_912_588,
		maxEntryBytes: 3_912_500,
		overage: 88,
	}
	const env = {
		CI: '1',
		GITHUB_EVENT_NAME: 'push',
		GITHUB_REF: 'refs/heads/main',
		GH_TOKEN: 'token',
	}
	expect(
		upsertStartupBundleOverageIssue(overage, { env, gh, findOpen }),
	).toEqual({
		action: 'created',
		name: 'runtime',
		url: 'https://github.com/kody-hq/kody/issues/42',
	})
	expect(
		upsertStartupBundleOverageIssue(overage, { env, gh, findOpen }),
	).toEqual({
		action: 'updated',
		name: 'runtime',
		number: 42,
	})
	expect(calls.some((args) => args[1] === 'create')).toBe(true)
	expect(calls.some((args) => args[1] === 'edit')).toBe(true)
	expect(calls.some((args) => args[1] === 'comment')).toBe(true)
})

function reportingEnv() {
	return {
		CI: '1',
		GITHUB_EVENT_NAME: 'push',
		GITHUB_REF: 'refs/heads/main',
		GH_TOKEN: 'token',
	}
}

function listSearchQuery(args: Array<string>) {
	const index = args.indexOf('--search')
	return index === -1 ? null : (args[index + 1] ?? null)
}

test('canonical title search updates the open issue without a labeled-list scan', () => {
	const calls: Array<Array<string>> = []
	const titled = {
		number: 42,
		title: startupBundleOverageIssueTitle('runtime'),
		body: 'earlier measure',
	}
	const gh = (args: Array<string>) => {
		calls.push(args)
		if (args[0] === 'issue' && args[1] === 'list') {
			return JSON.stringify([titled])
		}
		return ''
	}
	expect(
		upsertStartupBundleOverageIssue(
			{
				name: 'runtime',
				size: 3_912_588,
				maxEntryBytes: 3_912_500,
				overage: 88,
			},
			{
				env: reportingEnv(),
				gh,
			},
		),
	).toEqual({
		action: 'updated',
		name: 'runtime',
		number: 42,
	})
	expect(listSearchQuery(calls[0] ?? [])).toBe(
		'"Startup budget overage: runtime" in:title',
	)
	expect(calls.filter((args) => args[1] === 'list')).toHaveLength(1)
	expect(calls.some((args) => args.includes('--label'))).toBe(false)
	expect(calls.some((args) => args[1] === 'create')).toBe(false)
})

test('renamed open tracking issue is found by local marker match, not GitHub comment search', () => {
	const calls: Array<Array<string>> = []
	const marker = startupBundleOverageIssueMarker('runtime')
	const renamed = {
		number: 77,
		title: 'Startup growth to investigate (runtime)',
		body: `${marker}\nMeasured earlier.`,
	}
	const gh = (args: Array<string>) => {
		calls.push(args)
		if (args[0] === 'issue' && args[1] === 'list') {
			if (listSearchQuery(args) !== null) {
				return JSON.stringify([])
			}
			return JSON.stringify([renamed])
		}
		return ''
	}
	const result = upsertStartupBundleOverageIssue(
		{
			name: 'runtime',
			size: 3_912_588,
			maxEntryBytes: 3_912_500,
			overage: 88,
		},
		{
			env: reportingEnv(),
			gh,
		},
	)
	expect(result).toEqual({
		action: 'updated',
		name: 'runtime',
		number: 77,
	})
	const titleSearch = calls.find((args) => listSearchQuery(args) !== null)
	const labeledList = calls.find(
		(args) => args[1] === 'list' && args.includes('--label'),
	)
	expect(listSearchQuery(titleSearch ?? [])).toBe(
		'"Startup budget overage: runtime" in:title',
	)
	expect(labeledList).toContain('--label')
	expect(labeledList).toContain('friction')
	expect(calls.some((args) => args[1] === 'create')).toBe(false)
	expect(calls.some((args) => args[1] === 'edit' && args[2] === '77')).toBe(
		true,
	)
})

test('rejected title search still creates when no labeled issue exists', () => {
	const calls: Array<Array<string>> = []
	const gh = (args: Array<string>) => {
		calls.push(args)
		if (args[0] === 'issue' && args[1] === 'list') {
			if (listSearchQuery(args) !== null) {
				throw new Error('Invalid search query')
			}
			return JSON.stringify([])
		}
		if (args[0] === 'issue' && args[1] === 'create') {
			return 'https://github.com/kody-hq/kody/issues/99\n'
		}
		return ''
	}
	expect(
		upsertStartupBundleOverageIssue(
			{
				name: 'runtime',
				size: 3_912_588,
				maxEntryBytes: 3_912_500,
				overage: 88,
			},
			{
				env: reportingEnv(),
				gh,
			},
		),
	).toEqual({
		action: 'created',
		name: 'runtime',
		url: 'https://github.com/kody-hq/kody/issues/99',
	})
	expect(calls.some((args) => args[1] === 'create')).toBe(true)
})

test('reportStartupBundleOverages never throws when upsert fails', () => {
	const logs: Array<string> = []
	const actions = reportStartupBundleOverages(
		[
			{
				name: 'runtime',
				size: 3_912_588,
				maxEntryBytes: 3_912_500,
				overage: 88,
			},
		],
		{
			env: {
				CI: '1',
				GITHUB_EVENT_NAME: 'push',
				GITHUB_REF: 'refs/heads/main',
				GH_TOKEN: 'token',
			},
			upsert: () => {
				throw new Error('gh unavailable')
			},
			log: (message) => logs.push(message),
		},
	)
	expect(actions).toEqual([
		{
			action: 'skipped',
			name: 'runtime',
			reason: 'gh unavailable',
		},
	])
	expect(logs.join('\n')).toMatch(/does not fail CI/)
	expect(logs.join('\n')).toMatch(/Failed to upsert/)
})

function ghFlag(args: Array<string>, flag: string) {
	const index = args.indexOf(flag)
	return index === -1 ? '' : (args[index + 1] ?? '')
}

function section(body: string, heading: string) {
	const start = body.indexOf(heading)
	if (start === -1) return ''
	const rest = body.slice(start + heading.length)
	const next = rest.search(/\n### |\n<!-- kody-startup-bundle-attribution:/)
	return next === -1 ? rest : rest.slice(0, next)
}

const countedOverage = {
	name: 'runtime' as const,
	size: 3_912_588,
	maxEntryBytes: 3_912_500,
	overage: 88,
}

test('overage issue body keeps the byte counts and names the largest sources', () => {
	const body = buildStartupBundleOverageIssueBody(
		{
			...countedOverage,
			attribution: {
				sources: [
					{ source: 'packages/worker/src/small.ts', bytes: 10 },
					{ source: 'packages/worker/src/grown.ts', bytes: 1_500_000 },
					{ source: 'node_modules/zod/index.js', bytes: 200_000 },
					{
						source: 'packages/platform-worker/src/hub.ts',
						bytes: 40_000,
					},
					{
						source:
							'../../node_modules/.pnpm/zod@3.25.0/node_modules/zod/extra.js',
						bytes: 5,
					},
					{
						source: '../../node_modules/@cloudflare/workers/index.js',
						bytes: 20_000,
					},
				],
			},
		},
		{ sha: 'abc123' },
	)
	expect(body).toContain('- Measured: `3_912_588` bytes')
	expect(body).toContain('- Reviewed budget: `3_912_500` bytes')
	expect(body).toContain('- Overage: `88` bytes')
	expect(body).toContain('worker-startup-bundle-budget.json')
	const sources = section(body, '### Largest attributed sources')
	expect(sources).toContain('| `1_500_000` | `packages/worker/src/grown.ts` |')
	expect(sources.indexOf('grown.ts')).toBeLessThan(sources.indexOf('small.ts'))
	expect(sources).toContain('of `3_912_588` measured bytes')
	const packages = section(body, '### Largest packages')
	expect(packages).toContain('| `1_500_010` | `packages/worker` |')
	expect(packages).toContain('| `200_005` | `node_modules/zod` |')
	expect(packages).toContain(
		'| `20_000` | `node_modules/@cloudflare/workers` |',
	)
	expect(packages).toContain('| `40_000` | `packages/platform-worker` |')
	expect(body).not.toContain('### Largest byte deltas')
	expect(body).toContain('kody-startup-bundle-attribution:runtime complete')
	expect(body.indexOf('### Largest attributed sources')).toBeLessThan(
		body.indexOf('- SHA: `abc123`'),
	)
})

test('overage issue body omits attribution when the source map was not read', () => {
	const body = buildStartupBundleOverageIssueBody(countedOverage)
	expect(body).toContain('- Measured: `3_912_588` bytes')
	expect(body).not.toContain('### Largest attributed sources')
	expect(body).not.toContain('kody-startup-bundle-attribution:')
})

test('the source table keeps the largest rows only', () => {
	const sources = Array.from({ length: 30 }, (_, index) => ({
		source: `packages/worker/src/source-${String(index).padStart(2, '0')}.ts`,
		bytes: 1_000 - index,
	}))
	const body = buildStartupBundleOverageIssueBody({
		...countedOverage,
		attribution: { sources },
	})
	const table = section(body, '### Largest attributed sources')
	expect(table).toContain('source-00.ts')
	expect(table).toContain('source-24.ts')
	expect(table).not.toContain('source-25.ts')
	expect(table).toContain('Top 25 account for')
})

test('a previous issue snapshot adds byte deltas for what changed', () => {
	const first = buildStartupBundleOverageIssueBody({
		...countedOverage,
		attribution: {
			sources: [
				{ source: 'packages/worker/src/grown.ts', bytes: 100 },
				{ source: 'packages/worker/src/stable.ts', bytes: 50 },
			],
		},
	})
	const next = buildStartupBundleOverageIssueBody(
		{
			...countedOverage,
			attribution: {
				sources: [
					{ source: 'packages/worker/src/grown.ts', bytes: 180 },
					{ source: 'packages/worker/src/stable.ts', bytes: 50 },
					{ source: 'packages/worker/src/new.ts', bytes: 80 },
				],
			},
		},
		{ previousBody: first },
	)
	const deltas = section(next, '### Largest byte deltas')
	expect(deltas).toContain('the previous issue snapshot')
	expect(deltas).toContain('| `+80` | `packages/worker/src/grown.ts` |')
	expect(deltas).toContain('| `+80` | `packages/worker/src/new.ts` |')
	expect(deltas).not.toContain('stable.ts')
})

test('previous outdir deltas win over the stored issue snapshot', () => {
	const previous = buildStartupBundleOverageIssueBody({
		...countedOverage,
		attribution: {
			sources: [{ source: 'packages/worker/src/grown.ts', bytes: 100 }],
		},
	})
	const body = buildStartupBundleOverageIssueBody(
		{
			...countedOverage,
			attribution: {
				sources: [{ source: 'packages/worker/src/grown.ts', bytes: 180 }],
				outdirDeltas: [
					{
						source: 'packages/worker/src/grown.ts',
						bytes: 180,
						baseBytes: 170,
						delta: 10,
					},
				],
			},
		},
		{ previousBody: previous },
	)
	const deltas = section(body, '### Largest byte deltas')
	expect(deltas).toContain('the previous outdir')
	expect(deltas).toContain('| `+10` | `packages/worker/src/grown.ts` |')
	expect(deltas).not.toContain('+80')
})

test('an unchanged outdir baseline says there is no byte delta', () => {
	const body = buildStartupBundleOverageIssueBody({
		...countedOverage,
		attribution: {
			sources: [{ source: 'packages/worker/src/same.ts', bytes: 10 }],
			outdirDeltas: [
				{
					source: 'packages/worker/src/same.ts',
					bytes: 10,
					baseBytes: 10,
					delta: 0,
				},
			],
		},
	})
	expect(section(body, '### Largest byte deltas')).toContain(
		'No attributed byte changes against that baseline.',
	)
})

test('a truncated snapshot does not invent growth for modules it did not store', () => {
	const sources = Array.from({ length: 700 }, (_, index) => ({
		source: `packages/worker/src/mod-${String(index).padStart(4, '0')}-${'x'.repeat(60)}.ts`,
		bytes: 700 - index,
	}))
	const first = buildStartupBundleOverageIssueBody({
		name: 'platform',
		size: 500_000,
		maxEntryBytes: 100,
		overage: 499_900,
		attribution: { sources },
	})
	expect(first).toContain('kody-startup-bundle-attribution:platform truncated')
	const grown = sources.map((entry, index) =>
		index === 0 ? { ...entry, bytes: entry.bytes + 25 } : entry,
	)
	const next = buildStartupBundleOverageIssueBody(
		{
			name: 'platform',
			size: 2_000_000,
			maxEntryBytes: 100,
			overage: 1_999_900,
			attribution: {
				sources: [
					...grown,
					{ source: 'packages/worker/src/new-blob.ts', bytes: 1_500_000 },
				],
			},
		},
		{ previousBody: first },
	)
	const sourcesSection = section(next, '### Largest attributed sources')
	const deltas = section(next, '### Largest byte deltas')
	expect(sourcesSection).toContain('packages/worker/src/new-blob.ts')
	expect(deltas).toContain('largest sources only')
	expect(deltas).toContain('| `+25` |')
	expect(deltas).toContain('mod-0000-')
	expect(deltas).not.toContain('new-blob.ts')
	expect(next.length).toBeLessThanOrEqual(60_000)
})

test('a large attribution snapshot stays inside the GitHub issue body limit', () => {
	const sources = Array.from({ length: 2_000 }, (_, index) => ({
		source: `packages/worker/src/${'p'.repeat(180)}-${String(index)}.ts`,
		bytes: 2_000 - index,
	}))
	const body = buildStartupBundleOverageIssueBody(
		{
			...countedOverage,
			attribution: { sources },
		},
		{ snapshotBudget: 70_000 },
	)
	expect(body.length).toBeLessThanOrEqual(60_000)
	expect(body).toContain('### Largest attributed sources')
	expect(body).toContain('kody-startup-bundle-attribution:runtime')
})

test('upsert writes attributed sources and later deltas into the issue body', () => {
	const calls: Array<Array<string>> = []
	let listed: Array<{ number: number; title: string; body: string }> = []
	const gh = (args: Array<string>) => {
		calls.push(args)
		if (args[0] === 'issue' && args[1] === 'list') {
			return JSON.stringify(listed)
		}
		if (args[0] === 'issue' && args[1] === 'create') {
			listed = [
				{
					number: 7,
					title: startupBundleOverageIssueTitle('origin'),
					body: ghFlag(args, '--body'),
				},
			]
			return 'https://github.com/kody-hq/kody/issues/7\n'
		}
		if (args[0] === 'issue' && args[1] === 'edit') {
			const current = listed[0]
			if (current) listed[0] = { ...current, body: ghFlag(args, '--body') }
		}
		return ''
	}
	const env = reportingEnv()
	const created = upsertStartupBundleOverageIssue(
		{
			name: 'origin',
			size: 200,
			maxEntryBytes: 100,
			overage: 100,
			attribution: {
				sources: [{ source: 'packages/worker/src/grown.ts', bytes: 150 }],
			},
		},
		{ env, gh },
	)
	expect(created).toMatchObject({ action: 'created' })
	const createdBody = ghFlag(
		calls.find((args) => args[1] === 'create') ?? [],
		'--body',
	)
	expect(createdBody).toContain('packages/worker/src/grown.ts')
	expect(createdBody).not.toContain('### Largest byte deltas')
	expect(calls.some((args) => args[1] === 'comment')).toBe(false)
	calls.length = 0
	const updated = upsertStartupBundleOverageIssue(
		{
			name: 'origin',
			size: 260,
			maxEntryBytes: 100,
			overage: 160,
			attribution: {
				sources: [{ source: 'packages/worker/src/grown.ts', bytes: 210 }],
			},
		},
		{ env, gh },
	)
	expect(updated).toEqual({ action: 'updated', name: 'origin', number: 7 })
	const edited = ghFlag(
		calls.find((args) => args[1] === 'edit') ?? [],
		'--body',
	)
	expect(section(edited, '### Largest byte deltas')).toContain(
		'| `+60` | `packages/worker/src/grown.ts` |',
	)
	expect(
		ghFlag(calls.find((args) => args[1] === 'comment') ?? [], '--body'),
	).toContain('Largest attributed source: packages/worker/src/grown.ts')
})
