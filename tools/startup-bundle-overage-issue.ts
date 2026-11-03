import { spawnSync } from 'node:child_process'
import {
	diffAttributedSources,
	type AttributedSourceBytes,
	type SourceByteDelta,
} from './startup-bundle-attribution.ts'

export type StartupBundleOverageName = 'origin' | 'platform' | 'runtime'

/**
 * Sources come from the build that just measured the entry. `outdirDeltas`
 * is set only when that build was compared with a previous outdir. Otherwise
 * the next main-CI update diffs against the snapshot stored on the open issue.
 */
export type StartupBundleOverageAttribution = {
	sources: ReadonlyArray<AttributedSourceBytes>
	outdirDeltas?: ReadonlyArray<SourceByteDelta> | null
}

export type StartupBundleOverage = {
	name: StartupBundleOverageName
	size: number
	maxEntryBytes: number
	overage: number
	attribution?: StartupBundleOverageAttribution | null
}

const startupBundleOverageSourceLimit = 25
const startupBundleOveragePackageLimit = 8
const startupBundleOverageDeltaLimit = 25
/**
 * GitHub issue bodies cap at 65,536 characters. The visible tables stay small.
 * The hidden snapshot is what the next main push diffs against, capped so the
 * prose, tables, and marker still fit.
 */
const startupBundleAttributionSnapshotBudget = 40_000
/** Stay under GitHub's 65,536-character issue body cap with room for the marker. */
const startupBundleOverageIssueBodyLimit = 60_000

export type StartupBundleOverageIssueAction =
	| { action: 'created'; name: StartupBundleOverageName; url: string }
	| { action: 'updated'; name: StartupBundleOverageName; number: number }
	| { action: 'skipped'; name: StartupBundleOverageName; reason: string }

const startupBundleOverageIssueLabel = 'friction'

export function startupBundleOverageIssueTitle(name: StartupBundleOverageName) {
	return `Startup budget overage: ${name}`
}

export function startupBundleOverageIssueMarker(
	name: StartupBundleOverageName,
) {
	return `<!-- kody-startup-bundle-overage:${name} -->`
}

function formatStartupBundleBytes(bytes: number) {
	return bytes.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '_')
}

function formatStartupBundleOverageWarning(overage: StartupBundleOverage) {
	const warning =
		`${overage.name} startup entry is ${formatStartupBundleBytes(overage.size)} bytes, ` +
		`${formatStartupBundleBytes(overage.overage)} over its ` +
		`${formatStartupBundleBytes(overage.maxEntryBytes)}-byte reviewed budget ` +
		`(warning only; does not fail CI).`
	const top = largestAttributedSource(overage.attribution?.sources ?? [])
	if (!top) return warning
	return `${warning} Largest attributed source: ${top.source} (${formatStartupBundleBytes(top.bytes)} bytes).`
}

function largestAttributedSource(
	sources: ReadonlyArray<AttributedSourceBytes>,
) {
	return rankAttributedSources(sources)[0] ?? null
}

function rankAttributedSources(sources: ReadonlyArray<AttributedSourceBytes>) {
	return sources
		.filter((entry) => entry.bytes > 0)
		.sort(
			(left, right) =>
				right.bytes - left.bytes || left.source.localeCompare(right.source),
		)
}

function formatSignedStartupBundleBytes(bytes: number) {
	const formatted = formatStartupBundleBytes(Math.abs(bytes))
	if (bytes > 0) return `+${formatted}`
	if (bytes < 0) return `-${formatted}`
	return formatted
}

function escapeMarkdownTableCell(value: string) {
	return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function markdownByteTable(
	headers: readonly [string, string],
	rows: ReadonlyArray<readonly [string, string]>,
) {
	const [left, right] = headers
	return [
		`| ${left} | ${right} |`,
		'| ---: | --- |',
		...rows.map(
			([value, label]) =>
				`| \`${value}\` | \`${escapeMarkdownTableCell(label)}\` |`,
		),
	].join('\n')
}

/**
 * Group a source path the way an agent does by hand: the package under
 * `packages/`, or the npm package after the last `node_modules/` segment
 * (so pnpm's nested store still names `zod`, not `.pnpm`).
 */
function attributedPackageKey(source: string) {
	const normalized = source.replaceAll('\\', '/')
	const nodeModules = '/node_modules/'
	const nodeIndex = normalized.lastIndexOf(nodeModules)
	const nodeRest =
		nodeIndex === -1
			? normalized.startsWith('node_modules/')
				? normalized.slice('node_modules/'.length)
				: null
			: normalized.slice(nodeIndex + nodeModules.length)
	if (nodeRest !== null) {
		const [scope, name] = nodeRest.split('/')
		if (scope?.startsWith('@') && name) {
			return `node_modules/${scope}/${name}`
		}
		if (scope) return `node_modules/${scope}`
	}
	const packagesMarker = '/packages/'
	const packageIndex = normalized.lastIndexOf(packagesMarker)
	const packageRest =
		packageIndex === -1
			? normalized.startsWith('packages/')
				? normalized.slice('packages/'.length)
				: null
			: normalized.slice(packageIndex + packagesMarker.length)
	if (packageRest !== null) {
		const name = packageRest.split('/')[0]
		if (name) return `packages/${name}`
	}
	const parts = normalized.split('/').filter((part) => part.length > 0)
	if (parts.length >= 2) return `${parts[0]}/${parts[1]}`
	return normalized
}

function rollupAttributedPackages(
	sources: ReadonlyArray<AttributedSourceBytes>,
) {
	const totals = new Map<string, number>()
	for (const entry of sources) {
		const key = attributedPackageKey(entry.source)
		totals.set(key, (totals.get(key) ?? 0) + entry.bytes)
	}
	return [...totals.entries()]
		.map(([source, bytes]) => ({ source, bytes }))
		.sort(
			(left, right) =>
				right.bytes - left.bytes || left.source.localeCompare(right.source),
		)
}

function sanitizeSnapshotSource(source: string) {
	return source
		.replaceAll('\t', ' ')
		.replaceAll('\n', ' ')
		.replaceAll('-->', '>')
}

function encodeAttributionSnapshot(
	name: StartupBundleOverageName,
	sources: ReadonlyArray<AttributedSourceBytes>,
	budget: number,
) {
	const header = `<!-- kody-startup-bundle-attribution:${name} `
	const footer = '\n-->'
	const statusWidth = 'truncated'.length
	let used = header.length + statusWidth + footer.length
	const bodyLines: Array<string> = []
	let truncated = false
	for (const entry of sources) {
		const line = `\n${String(entry.bytes)}\t${sanitizeSnapshotSource(entry.source)}`
		if (used + line.length > budget) {
			truncated = true
			break
		}
		bodyLines.push(line)
		used += line.length
	}
	const status = truncated ? 'truncated' : 'complete'
	return `${header}${status}${bodyLines.join('')}${footer}`
}

function parseAttributionSnapshot(
	body: string,
	name: StartupBundleOverageName,
) {
	const marker = `<!-- kody-startup-bundle-attribution:${name} `
	const start = body.indexOf(marker)
	if (start === -1) return null
	const end = body.indexOf('-->', start)
	if (end === -1) return null
	const inner = body.slice(start + marker.length, end).replace(/^\n/, '')
	const newline = inner.indexOf('\n')
	const status = (newline === -1 ? inner : inner.slice(0, newline)).trim()
	if (status !== 'complete' && status !== 'truncated') return null
	const sources: Array<AttributedSourceBytes> = []
	const lines = newline === -1 ? [] : inner.slice(newline + 1).split('\n')
	for (const line of lines) {
		if (line.trim() === '') continue
		const tab = line.indexOf('\t')
		if (tab <= 0) return null
		const bytes = Number(line.slice(0, tab))
		const source = line.slice(tab + 1)
		if (!Number.isSafeInteger(bytes) || bytes < 0 || source.length === 0) {
			return null
		}
		sources.push({ bytes, source })
	}
	return { complete: status === 'complete', sources }
}

function baselineByteDeltas(
	attribution: StartupBundleOverageAttribution,
	previousBody: string | null,
	name: StartupBundleOverageName,
) {
	if (attribution.outdirDeltas) {
		return {
			deltas: attribution.outdirDeltas,
			label: 'the previous outdir',
		}
	}
	if (!previousBody) return null
	const snapshot = parseAttributionSnapshot(previousBody, name)
	if (!snapshot || snapshot.sources.length === 0) return null
	if (snapshot.complete) {
		return {
			deltas: diffAttributedSources(attribution.sources, snapshot.sources),
			label: 'the previous issue snapshot',
		}
	}
	const known = new Set(snapshot.sources.map((entry) => entry.source))
	return {
		deltas: diffAttributedSources(
			attribution.sources.filter((entry) => known.has(entry.source)),
			snapshot.sources,
		),
		label:
			'the previous issue snapshot (largest sources only; modules absent from that snapshot are omitted)',
	}
}

function formatStartupBundleOverageAttribution(
	overage: StartupBundleOverage,
	context: {
		previousBody?: string | null
		snapshotBudget?: number
	},
) {
	const attribution = overage.attribution
	if (!attribution) return []
	const ranked = rankAttributedSources(attribution.sources)
	if (ranked.length === 0) return []
	const shown = ranked.slice(0, startupBundleOverageSourceLimit)
	const shownBytes = shown.reduce((sum, entry) => sum + entry.bytes, 0)
	const lines = [
		'### Largest attributed sources',
		'',
		'Generated bytes mapped back to original sources. The largest rows show whether one module or many account for the startup entry.',
		'',
		`Top ${String(shown.length)} account for \`${formatStartupBundleBytes(shownBytes)}\` of \`${formatStartupBundleBytes(overage.size)}\` measured bytes.`,
		'',
		markdownByteTable(
			['Bytes', 'Source'],
			shown.map((entry) => [
				formatStartupBundleBytes(entry.bytes),
				entry.source,
			]),
		),
		'',
	]
	const packages = rollupAttributedPackages(ranked).slice(
		0,
		startupBundleOveragePackageLimit,
	)
	if (packages.length > 0) {
		lines.push(
			'### Largest packages',
			'',
			'The same bytes grouped by package.',
			'',
			markdownByteTable(
				['Bytes', 'Package'],
				packages.map((entry) => [
					formatStartupBundleBytes(entry.bytes),
					entry.source,
				]),
			),
			'',
		)
	}
	const comparison = baselineByteDeltas(
		attribution,
		context.previousBody ?? null,
		overage.name,
	)
	if (comparison) {
		const changed = [...comparison.deltas]
			.filter((entry) => entry.delta !== 0)
			.sort(
				(left, right) =>
					Math.abs(right.delta) - Math.abs(left.delta) ||
					right.bytes - left.bytes ||
					left.source.localeCompare(right.source),
			)
			.slice(0, startupBundleOverageDeltaLimit)
		lines.push(
			'### Largest byte deltas',
			'',
			`Compared with ${comparison.label}.`,
			'',
		)
		if (changed.length === 0) {
			lines.push('No attributed byte changes against that baseline.', '')
		} else {
			lines.push(
				markdownByteTable(
					['Delta', 'Source'],
					changed.map((entry) => [
						formatSignedStartupBundleBytes(entry.delta),
						entry.source,
					]),
				),
				'',
			)
		}
	}
	lines.push(
		encodeAttributionSnapshot(
			overage.name,
			ranked,
			context.snapshotBudget ?? startupBundleAttributionSnapshotBudget,
		),
		'',
	)
	return lines
}

export function buildStartupBundleOverageIssueBody(
	overage: StartupBundleOverage,
	context: {
		sha?: string | null
		runUrl?: string | null
		ref?: string | null
		previousBody?: string | null
		snapshotBudget?: number
	} = {},
) {
	const lines = [
		startupBundleOverageIssueMarker(overage.name),
		'',
		`The **${overage.name}** Worker startup entry measured above its reviewed byte budget.`,
		'',
		`- Measured: \`${formatStartupBundleBytes(overage.size)}\` bytes`,
		`- Reviewed budget: \`${formatStartupBundleBytes(overage.maxEntryBytes)}\` bytes`,
		`- Overage: \`${formatStartupBundleBytes(overage.overage)}\` bytes`,
		'',
		'This no longer fails ✅ Validate / 🧹 Static or blocks 🚀 Deploy. Track the growth here, then either:',
		'',
		'1. Shrink the startup graph (preferred), or',
		'2. Raise `tools/worker-startup-bundle-budget.json` and append a note in `tools/worker-startup-bundle-notes.md`.',
		'',
	]
	lines.push(...formatStartupBundleOverageAttribution(overage, context))
	if (context.sha) {
		lines.push(`- SHA: \`${context.sha}\``)
	}
	if (context.ref) {
		lines.push(`- Ref: \`${context.ref}\``)
	}
	if (context.runUrl) {
		lines.push(`- CI run: ${context.runUrl}`)
	}
	lines.push('')
	const body = `${lines.join('\n').trimEnd()}\n`
	if (body.length <= startupBundleOverageIssueBodyLimit) return body
	const snapshotBudget =
		context.snapshotBudget ?? startupBundleAttributionSnapshotBudget
	if (snapshotBudget <= 4_000) {
		return body.replace(
			/<!-- kody-startup-bundle-attribution:[\s\S]*?-->\n?/,
			'',
		)
	}
	return buildStartupBundleOverageIssueBody(overage, {
		...context,
		snapshotBudget: Math.floor(snapshotBudget / 2),
	})
}

export function shouldReportStartupBundleOverageIssue(
	env: NodeJS.ProcessEnv = process.env,
) {
	const token = env.GH_TOKEN ?? env.GITHUB_TOKEN
	if (!token) return false
	if (env.CI !== '1' && env.CI !== 'true') return false
	if (env.GITHUB_EVENT_NAME !== 'push') return false
	const ref = env.GITHUB_REF ?? ''
	const refName = env.GITHUB_REF_NAME ?? ''
	return ref === 'refs/heads/main' || refName === 'main'
}

const startupBundleOverageGhTimeoutMs = 10_000

function runGh(args: Array<string>, env: NodeJS.ProcessEnv = process.env) {
	const result = spawnSync('gh', args, {
		encoding: 'utf8',
		env,
		timeout: startupBundleOverageGhTimeoutMs,
		killSignal: 'SIGKILL',
	})
	if (result.error) {
		throw result.error
	}
	if (result.status !== 0) {
		throw new Error(result.stderr || `gh ${args.join(' ')} failed`)
	}
	return result.stdout
}

type ListedIssue = {
	number: number
	title: string
	body: string | null
}

function parseListedIssues(raw: string) {
	return JSON.parse(raw) as Array<ListedIssue>
}

function matchListedOverageIssue(
	issues: Array<ListedIssue>,
	title: string,
	marker: string,
) {
	return (
		issues.find((issue) => issue.title === title) ??
		issues.find((issue) => issue.body?.includes(marker) ?? false) ??
		null
	)
}

function listOpenIssues(
	extraArgs: Array<string>,
	env: NodeJS.ProcessEnv,
	gh: typeof runGh,
) {
	return parseListedIssues(
		gh(
			[
				'issue',
				'list',
				'--state',
				'open',
				'--limit',
				'50',
				'--json',
				'number,title,body',
				...extraArgs,
			],
			env,
		),
	)
}

function startupBundleOverageIssueTitleSearch(name: StartupBundleOverageName) {
	return `"${startupBundleOverageIssueTitle(name)}" in:title`
}

function findOpenOverageIssue(
	name: StartupBundleOverageName,
	env: NodeJS.ProcessEnv = process.env,
	gh: typeof runGh = runGh,
) {
	const title = startupBundleOverageIssueTitle(name)
	const marker = startupBundleOverageIssueMarker(name)
	// GitHub issue search does not index HTML comments and treats < > as
	// operators, so the body marker cannot go in --search. Find the canonical
	// title first; then scan labeled issues locally for a renamed tracker.
	let titled: Array<ListedIssue> = []
	try {
		titled = listOpenIssues(
			['--search', startupBundleOverageIssueTitleSearch(name)],
			env,
			gh,
		)
	} catch {
		titled = []
	}
	const fromTitleSearch = matchListedOverageIssue(titled, title, marker)
	if (fromTitleSearch) return fromTitleSearch

	return matchListedOverageIssue(
		listOpenIssues(['--label', startupBundleOverageIssueLabel], env, gh),
		title,
		marker,
	)
}

function resolveStartupBundleOverageRunUrl(
	env: NodeJS.ProcessEnv = process.env,
) {
	if (env.GITHUB_RUN_URL) return env.GITHUB_RUN_URL
	const server = env.GITHUB_SERVER_URL
	const repo = env.GITHUB_REPOSITORY
	const runId = env.GITHUB_RUN_ID
	if (server && repo && runId) {
		return `${server.replace(/\/$/, '')}/${repo}/actions/runs/${runId}`
	}
	return null
}

export function upsertStartupBundleOverageIssue(
	overage: StartupBundleOverage,
	options: {
		env?: NodeJS.ProcessEnv
		sha?: string | null
		runUrl?: string | null
		ref?: string | null
		gh?: typeof runGh
		findOpen?: typeof findOpenOverageIssue
	} = {},
): StartupBundleOverageIssueAction {
	const env = options.env ?? process.env
	if (!shouldReportStartupBundleOverageIssue(env)) {
		return {
			action: 'skipped',
			name: overage.name,
			reason: 'issue reporting is only enabled on main CI pushes with GH_TOKEN',
		}
	}
	const gh = options.gh ?? runGh
	const findOpen = options.findOpen ?? findOpenOverageIssue
	const existing = findOpen(overage.name, env, gh)
	const body = buildStartupBundleOverageIssueBody(overage, {
		sha: options.sha ?? env.GITHUB_SHA ?? null,
		runUrl: options.runUrl ?? resolveStartupBundleOverageRunUrl(env),
		ref: options.ref ?? env.GITHUB_REF ?? env.GITHUB_REF_NAME ?? null,
		previousBody: existing?.body ?? null,
	})
	if (existing) {
		gh(['issue', 'edit', String(existing.number), '--body', body], env)
		gh(
			[
				'issue',
				'comment',
				String(existing.number),
				'--body',
				formatStartupBundleOverageWarning(overage),
			],
			env,
		)
		return { action: 'updated', name: overage.name, number: existing.number }
	}
	const created = gh(
		[
			'issue',
			'create',
			'--title',
			startupBundleOverageIssueTitle(overage.name),
			'--body',
			body,
			'--label',
			startupBundleOverageIssueLabel,
		],
		env,
	)
	return { action: 'created', name: overage.name, url: created.trim() }
}

export function reportStartupBundleOverages(
	overages: ReadonlyArray<StartupBundleOverage>,
	options: {
		env?: NodeJS.ProcessEnv
		upsert?: typeof upsertStartupBundleOverageIssue
		log?: (message: string) => void
	} = {},
) {
	const log = options.log ?? console.warn
	const upsert = options.upsert ?? upsertStartupBundleOverageIssue
	const actions: Array<StartupBundleOverageIssueAction> = []
	for (const overage of overages) {
		log(formatStartupBundleOverageWarning(overage))
		try {
			const action = upsert(overage, { env: options.env })
			actions.push(action)
			if (action.action === 'created') {
				log(`Opened startup budget overage issue: ${action.url}`)
			} else if (action.action === 'updated') {
				log(
					`Updated startup budget overage issue #${String(action.number)} for ${action.name}`,
				)
			} else {
				log(
					`Skipped startup budget overage issue for ${action.name}: ${action.reason}`,
				)
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			log(
				`Failed to upsert startup budget overage issue for ${overage.name}: ${message}`,
			)
			actions.push({
				action: 'skipped',
				name: overage.name,
				reason: message,
			})
		}
	}
	return actions
}
