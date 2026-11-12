/**
 * Pure auto-merge eligibility. No I/O, no secrets, no clocks of its own.
 * Callers pass `now` and the pull request snapshot.
 */

const DEPENDENCY_SECTIONS = [
	'dependencies',
	'devDependencies',
	'optionalDependencies',
	'peerDependencies',
]

const PENDING_STATUSES = new Set([
	'queued',
	'in_progress',
	'waiting',
	'pending',
	'requested',
])

const VERDICT_PATTERN =
	/<!--\s*factory-review:\s*verdict=(pass|fail)\s+sha=([0-9a-f]{40})\s*-->/gi

function escapeChar(char) {
	return '\\^$+?.()|[]{}'.includes(char) ? `\\${char}` : char
}

function compileGlob(glob) {
	let source = '^'
	let index = 0
	while (index < glob.length) {
		if (glob[index] === '*' && glob[index + 1] === '*') {
			if (glob[index + 2] === '/') {
				source += '(?:.*/)?'
				index += 3
				continue
			}
			source += '.*'
			index += 2
			continue
		}
		if (glob[index] === '*') {
			source += '[^/]*'
			index += 1
			continue
		}
		source += escapeChar(glob[index])
		index += 1
	}
	return new RegExp(`${source}$`)
}

export function pathMatches(pattern, filePath) {
	const normalized = String(filePath ?? '').replace(/^\.\//, '')
	if (compileGlob(pattern).test(normalized)) return true
	if (!String(pattern).includes('/')) {
		return compileGlob(`**/${pattern}`).test(normalized)
	}
	return false
}

function labelName(label) {
	return typeof label === 'string' ? label : label?.name
}

export function hasLabel(labels, name) {
	return (labels ?? []).some((label) => labelName(label) === name)
}

function branchAllowed(headRef, config) {
	const prefixes = [
		...(config.factoryPrefixes ?? []),
		...(config.reviewOnlyPrefixes ?? []),
	]
	return prefixes.some(
		(prefix) => prefix && String(headRef ?? '').startsWith(prefix),
	)
}

function changedPaths(file) {
	return [
		file?.filename,
		file?.previous_filename,
		file?.previousFilename,
	].filter((value) => typeof value === 'string' && value.length > 0)
}

function manualPathReasons(config, files) {
	const reasons = []
	const patterns = config.manualPaths ?? []
	for (const file of files ?? []) {
		for (const changed of changedPaths(file)) {
			if (patterns.some((pattern) => pathMatches(pattern, changed))) {
				reasons.push(`manual path ${changed}`)
			}
		}
	}
	return reasons
}

function parseDocument(value) {
	if (value == null || value === '') return {}
	if (typeof value === 'string') return JSON.parse(value)
	if (typeof value === 'object') return value
	throw new Error('unsupported package.json value')
}

function semverParts(value) {
	const match = String(value).match(/(\d+)\.(\d+)\.(\d+)/)
	if (!match) return null
	return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isMajorBump(before, after) {
	if (before === after) return false
	const left = semverParts(before)
	const right = semverParts(after)
	if (!left || !right) return false
	if (left[0] !== right[0]) return true
	return left[0] === 0 && left[1] !== right[1]
}

export function dependencyReasons(packageJsons) {
	const reasons = []
	for (const file of packageJsons ?? []) {
		let before
		let after
		try {
			before = parseDocument(file.before)
			after = parseDocument(file.after)
		} catch {
			reasons.push(`unreadable package.json ${file.path ?? ''}`.trim())
			continue
		}
		for (const section of DEPENDENCY_SECTIONS) {
			const left =
				before[section] && typeof before[section] === 'object'
					? before[section]
					: {}
			const right =
				after[section] && typeof after[section] === 'object'
					? after[section]
					: {}
			for (const name of Object.keys(right)) {
				if (!Object.hasOwn(left, name)) {
					reasons.push(`new dependency ${name}`)
					continue
				}
				if (isMajorBump(String(left[name]), String(right[name]))) {
					reasons.push(`major bump ${name} in ${section}`)
				}
			}
		}
	}
	return reasons
}

function deviceTexts(pr) {
	return [pr.body, ...(pr.linkedIssueBodies ?? [])]
}

function deviceHit(config, pr) {
	if (!config.deviceTestPattern) return false
	let pattern
	try {
		pattern = new RegExp(config.deviceTestPattern, 'i')
	} catch {
		return false
	}
	return deviceTexts(pr).some((text) => pattern.test(String(text ?? '')))
}

const ACCEPTED_REVIEW_STATES = new Set([
	'commented',
	'approved',
	'changes_requested',
])

function reviewEntries(reviews) {
	return (reviews ?? []).map((entry) =>
		typeof entry === 'string' ? { body: entry, at: 0 } : entry,
	)
}

function acceptedReview(review, author) {
	if (!author || review?.author !== author) return false
	if (review?.edited === true) return false
	const state = String(review?.state ?? '').toLowerCase()
	return ACCEPTED_REVIEW_STATES.has(state)
}

export function latestVerdict(reviews, sha, author) {
	const entries = reviewEntries(reviews)
		.filter((entry) => acceptedReview(entry, author))
		.sort((left, right) => {
			const leftAt = Date.parse(left.at ?? left.submittedAt ?? '') || 0
			const rightAt = Date.parse(right.at ?? right.submittedAt ?? '') || 0
			return leftAt - rightAt
		})
	let verdict = null
	for (const entry of entries) {
		const body = String(entry.body ?? '')
		VERDICT_PATTERN.lastIndex = 0
		let match = VERDICT_PATTERN.exec(body)
		while (match) {
			if (match[2] === sha) verdict = match[1].toLowerCase()
			match = VERDICT_PATTERN.exec(body)
		}
	}
	return verdict
}

function runSha(run) {
	return run?.sha ?? run?.head_sha ?? null
}

function runName(run) {
	return run?.name ?? run?.workflow ?? null
}

function runCreated(run) {
	return Date.parse(run?.createdAt ?? run?.created_at ?? '')
}

function runUpdated(run) {
	const updated = Date.parse(run?.updatedAt ?? run?.updated_at ?? '')
	if (!Number.isNaN(updated)) return updated
	return runCreated(run)
}

export function latestCiRun(runs, sha, workflowName) {
	const matching = (runs ?? []).filter((run) => {
		if (runSha(run) !== sha) return false
		const name = runName(run)
		if (workflowName && name && name !== workflowName) return false
		return true
	})
	matching.sort((left, right) => {
		const attempt =
			(right.attempt ?? right.run_attempt ?? 1) -
			(left.attempt ?? left.run_attempt ?? 1)
		if (attempt !== 0) return attempt
		return runUpdated(right) - runUpdated(left)
	})
	return matching[0] ?? null
}

function classifyCi(run) {
	if (!run) return 'pending'
	const status = run.status ?? 'completed'
	if (PENDING_STATUSES.has(status) || status !== 'completed') return 'pending'
	if (run.conclusion === 'success') return 'pass'
	return 'failed'
}

function ciReason(run) {
	if (!run || classifyCi(run) === 'pending') return 'CI has not concluded'
	if (run.conclusion === 'failure') return 'CI failure'
	return `CI conclusion ${run.conclusion} does not pass`
}

export function headPushedAt(runs, sha, commitAt) {
	const times = (runs ?? [])
		.filter((run) => runSha(run) === sha)
		.map((run) => runCreated(run))
		.filter((time) => !Number.isNaN(time))
	if (times.length > 0) return Math.min(...times)
	const commit = Date.parse(commitAt ?? '')
	return Number.isNaN(commit) ? null : commit
}

function timedOut(input, sha, now) {
	const anchor = headPushedAt(
		input.runs ?? input.ciRuns ?? [],
		sha,
		input.commitAt ?? input.pr?.commitAt,
	)
	if (anchor == null) return false
	const limit = (input.config.timeoutMinutes ?? 60) * 60 * 1000
	return now - anchor >= limit
}

function fixupAddedAt(pr, label) {
	if (pr.fixupLabelAddedAt) return Date.parse(pr.fixupLabelAddedAt)
	for (const entry of pr.labels ?? []) {
		if (labelName(entry) === label && entry?.addedAt) {
			return Date.parse(entry.addedAt)
		}
	}
	return null
}

function result(decision, reasons) {
	const discordState =
		decision === 'ready' || decision === 'stuck' || decision === 'failed'
			? decision
			: null
	return { decision, reasons, discordState }
}

export function evaluate(input) {
	const config = input.config
	const pr = input.pr
	const now = Date.parse(input.now)
	const runs = input.runs ?? input.ciRuns ?? []

	if (pr.state !== 'open') return result('ignore', ['closed'])
	if (pr.draft === true) return result('ignore', ['draft'])
	if (!pr.headRepo || pr.headRepo !== pr.repo) return result('ignore', ['fork'])
	if (pr.author !== config.author) return result('ignore', ['author'])
	if (pr.base !== config.base) return result('ignore', ['base'])
	if (!branchAllowed(pr.headRef, config)) return result('ignore', ['branch'])

	if (pr.lookupIncomplete === true) {
		const reason = 'lookup incomplete'
		return timedOut(input, pr.headSha, now)
			? result('stuck', [reason])
			: result('wait', [reason])
	}

	if (hasLabel(pr.labels, config.noAutomergeLabel)) {
		return result('ready', ['no-automerge'])
	}

	if (hasLabel(pr.labels, config.fixupLabel)) {
		const added = fixupAddedAt(pr, config.fixupLabel)
		const staleMs = (config.fixupStaleHours ?? 4) * 60 * 60 * 1000
		if (added != null && !Number.isNaN(added) && now - added > staleMs) {
			return result('stuck', ['fixup stale'])
		}
		return result('wait', ['fixup running'])
	}

	const ci = latestCiRun(runs, pr.headSha, config.ciWorkflow)
	const ciKind = classifyCi(ci)
	if (ciKind === 'failed') return result('failed', [ciReason(ci)])
	if (ciKind === 'pending') {
		const reason = 'CI has not concluded'
		return timedOut(input, pr.headSha, now)
			? result('stuck', [reason])
			: result('wait', [reason])
	}

	const verdict = latestVerdict(pr.reviews, pr.headSha, config.author)
	const manual = [
		...(verdict === 'fail' ? ['verdict fail'] : []),
		...manualPathReasons(config, pr.files),
		...dependencyReasons(pr.packageJsons),
		...(deviceHit(config, pr) ? ['device test'] : []),
	]
	if (manual.length > 0) return result('ready', manual)
	if (verdict !== 'pass') {
		return timedOut(input, pr.headSha, now)
			? result('stuck', ['no verdict'])
			: result('wait', ['no verdict'])
	}
	return result('merge', [])
}

export function sanitizeTitle(title) {
	return String(title ?? '').replaceAll(/[@`]/g, '')
}

const STATE_LABELS = {
	ready: 'ready for Cameron',
	stuck: 'stuck or failed',
	failed: 'stuck or failed',
	merged: 'auto-merged',
}

export function buildNotice({ state, repo, number, title, url, reasons }) {
	const reason =
		reasons && reasons.length > 0 ? reasons.map(String).join('; ') : 'none'
	return [
		`Auto-merge: ${STATE_LABELS[state] ?? state}`,
		`Repo: ${repo}`,
		`PR: #${number} ${sanitizeTitle(title)}`,
		String(url),
		`Reason: ${reason}`,
	].join('\n')
}

export function notifyMarker(state, sha) {
	return `<!-- automerge-notify: state=${state} sha=${sha} -->`
}

export function hasNotifyMarker(texts, state, sha) {
	const pattern = new RegExp(
		`<!--\\s*automerge-notify:\\s*state=${state}\\s+sha=${sha}\\s*-->`,
	)
	return (texts ?? []).some((text) => pattern.test(String(text ?? '')))
}
