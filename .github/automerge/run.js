/**
 * GitHub Actions glue for auto-merge. Loads only when the workflow checks out
 * the default branch. Never checks out or executes pull request code.
 *
 * Discord webhook URLs are read from the environment inside postDiscord and
 * are not written to logs, comments, errors, or GitHub API calls.
 */

import {
	buildNotice,
	evaluate,
	hasNotifyMarker,
	notifyMarker,
} from './eligibility.js'

export const LOOKUP_PAGE_LIMIT = 40

const LINKED_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){closingIssuesReferences(first:100,after:$cursor){pageInfo{hasNextPage endCursor}nodes{number state body repository{nameWithOwner}}}}}}`

const REVIEWS_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviews(first:100,after:$cursor){pageInfo{hasNextPage endCursor}nodes{author{login}body state submittedAt lastEditedAt}}}}}`

const ACTIVE_DEPLOY = new Set([
	'queued',
	'in_progress',
	'waiting',
	'pending',
	'requested',
])

function repositoryOf(context) {
	const repo = context?.repo
	if (repo && typeof repo === 'object' && repo.owner && repo.repo) {
		return { owner: repo.owner, repo: repo.repo }
	}
	throw new Error('context.repo is required')
}

function headerLink(response) {
	const headers = response?.headers ?? {}
	return String(headers.link ?? headers.Link ?? '')
}

function asBatch(value) {
	return Array.isArray(value) ? value : null
}

async function listPages(github, route, params, readBatch) {
	const items = []
	let page = 1
	for (;;) {
		const response = await github.request(route, {
			...params,
			per_page: 100,
			page,
		})
		const batch = readBatch(response)
		if (batch == null) return { items, truncated: true }
		items.push(...batch)
		const hasNext = headerLink(response).includes('rel="next"')
		if (!hasNext) return { items, truncated: false }
		if (batch.length === 0 || page >= LOOKUP_PAGE_LIMIT) {
			return { items, truncated: true }
		}
		page += 1
	}
}

function listAll(github, route, params) {
	return listPages(github, route, params, (response) => asBatch(response?.data))
}

function listWorkflowRuns(github, owner, repo, query) {
	return listPages(
		github,
		'GET /repos/{owner}/{repo}/actions/runs',
		{ owner, repo, ...query },
		(response) => asBatch(response?.data?.workflow_runs),
	)
}

function graphqlFailed(response) {
	return (
		Array.isArray(response?.data?.errors) && response.data.errors.length > 0
	)
}

async function paginateConnection(github, query, variables, readConnection) {
	const nodes = []
	let cursor = null
	let page = 0
	for (;;) {
		page += 1
		const response = await github.request('POST /graphql', {
			query,
			variables: { ...variables, cursor },
		})
		if (graphqlFailed(response)) return { nodes, truncated: true }
		const connection = readConnection(response)
		if (
			!connection ||
			!Array.isArray(connection.nodes) ||
			connection.pageInfo == null
		) {
			return { nodes, truncated: true }
		}
		for (const node of connection.nodes) {
			if (node) nodes.push(node)
		}
		if (connection.pageInfo.hasNextPage !== true) {
			return { nodes, truncated: false }
		}
		if (connection.nodes.length === 0 || page >= LOOKUP_PAGE_LIMIT) {
			return { nodes, truncated: true }
		}
		cursor = connection.pageInfo.endCursor
		if (typeof cursor !== 'string' || cursor.length === 0) {
			return { nodes, truncated: true }
		}
	}
}

function mapRun(run) {
	return {
		sha: run.head_sha,
		name: run.name,
		status: run.status,
		conclusion: run.conclusion,
		attempt: run.run_attempt,
		createdAt: run.created_at,
		updatedAt: run.updated_at,
	}
}

function isPackageJson(filePath) {
	return filePath === 'package.json' || filePath.endsWith('/package.json')
}

function decodeContent(data) {
	if (!data || Array.isArray(data) || data.type === 'dir') return null
	if (typeof data.content !== 'string') return null
	if (data.encoding === 'base64' || data.encoding == null) {
		return Buffer.from(data.content.replaceAll('\n', ''), 'base64').toString(
			'utf8',
		)
	}
	return data.content
}

async function readFileAt(github, owner, repo, path, ref) {
	try {
		const response = await github.request(
			'GET /repos/{owner}/{repo}/contents/{path}',
			{ owner, repo, path, ref },
		)
		return decodeContent(response?.data)
	} catch (error) {
		if (error?.status === 404) return null
		throw error
	}
}

function linkedIssues(github, owner, repo, number) {
	return paginateConnection(
		github,
		LINKED_QUERY,
		{ owner, name: repo, number },
		(response) =>
			response?.data?.data?.repository?.pullRequest?.closingIssuesReferences,
	)
}

function pullReviews(github, owner, repo, number) {
	return paginateConnection(
		github,
		REVIEWS_QUERY,
		{ owner, name: repo, number },
		(response) => response?.data?.data?.repository?.pullRequest?.reviews,
	)
}

function mapReview(node) {
	const editedAt = node?.lastEditedAt
	return {
		body: node?.body ?? '',
		at: node?.submittedAt ?? null,
		author: node?.author?.login ?? '',
		state: String(node?.state ?? '').toLowerCase(),
		edited: editedAt != null && String(editedAt).length > 0,
	}
}

function fullName(owner, repo) {
	return `${owner}/${repo}`
}

async function closeLinked(github, owner, repo, number, issues, core) {
	const repoName = fullName(owner, repo)
	for (const issue of issues) {
		const issueNumber = issue.number
		if (!/^\d+$/.test(String(issueNumber))) {
			core.warning(`Skipping an unexpected linked issue id on #${number}.`)
			continue
		}
		const issueRepo = issue.repository?.nameWithOwner
		if (issueRepo !== repoName) {
			core.info(
				`Skipping linked issue ${issueRepo || 'unknown'}#${issueNumber}: not in ${repoName}.`,
			)
			continue
		}
		const state = String(issue.state ?? '').toLowerCase()
		if (state !== 'open') {
			core.info(
				`Linked issue #${issueNumber} is already ${state || 'unknown'}.`,
			)
			continue
		}
		try {
			await github.request(
				'PATCH /repos/{owner}/{repo}/issues/{issue_number}',
				{
					owner,
					repo,
					issue_number: Number(issueNumber),
					state: 'closed',
					state_reason: 'completed',
				},
			)
			core.info(`Closed #${issueNumber} from squash-merge of #${number}.`)
		} catch {
			core.warning(
				`Failed to close #${issueNumber} from #${number}. The squash merge stands.`,
			)
		}
	}
}

function commentText(comment) {
	return comment?.body ?? ''
}

function webhookVariable(state) {
	return state === 'merged'
		? 'DISCORD_WEBHOOK_PR_MERGED'
		: 'DISCORD_WEBHOOK_PR_READY'
}

async function postDiscord(core, url, payload) {
	let response
	try {
		response = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
		})
	} catch {
		core.warning(
			'Discord post failed before a response. The marker was not written.',
		)
		return false
	}
	const status = response?.status
	if (typeof status !== 'number' || status < 200 || status >= 300) {
		core.warning(
			`Discord post returned HTTP ${status ?? 'no-status'}. The marker was not written.`,
		)
		return false
	}
	return true
}

async function notify(github, owner, repo, pr, state, reasons, comments, core) {
	const sha = pr.headSha
	const bodies = comments.map(commentText)
	if (hasNotifyMarker(bodies, state, sha)) {
		core.info(
			`Discord notice already posted for #${pr.number} ${state} ${sha}.`,
		)
		return
	}
	const url = `https://github.com/${owner}/${repo}/pull/${pr.number}`
	const content = buildNotice({
		state,
		repo: fullName(owner, repo),
		number: pr.number,
		title: pr.title,
		url,
		reasons,
	})
	const secret = process.env[webhookVariable(state)]
	let skipped = false
	if (typeof secret !== 'string' || secret.length === 0) {
		core.warning(
			'Discord webhook secret is missing. Skipping the post. Discord: skipped.',
		)
		skipped = true
	} else {
		const posted = await postDiscord(core, secret, {
			content,
			allowed_mentions: { parse: [] },
		})
		if (!posted) return
	}
	const lines = [content]
	if (skipped) lines.push('Discord: skipped')
	lines.push(notifyMarker(state, sha))
	try {
		await github.request(
			'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
			{
				owner,
				repo,
				issue_number: pr.number,
				body: lines.join('\n'),
			},
		)
	} catch {
		core.warning(
			`Could not write the Discord marker for #${pr.number}. The marker was not written.`,
		)
	}
}

async function loadLookup(name, failures, work) {
	try {
		const result = await work()
		if (result?.truncated === true) failures.push(name)
		return result
	} catch {
		failures.push(name)
		return { items: [], nodes: [], truncated: true }
	}
}

async function gather(github, owner, repo, pr, config, core) {
	const number = pr.number
	const headSha = pr.head.sha
	const failures = []
	const commentFailures = []
	const [
		filesPage,
		commentsPage,
		labelsPage,
		eventsPage,
		runsPage,
		issuesPage,
		reviewsPage,
	] = await Promise.all([
		loadLookup('files', failures, () =>
			listAll(github, 'GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
				owner,
				repo,
				pull_number: number,
			}),
		),
		loadLookup('comments', commentFailures, () =>
			listAll(
				github,
				'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
				{ owner, repo, issue_number: number },
			),
		),
		loadLookup('labels', failures, () =>
			listAll(
				github,
				'GET /repos/{owner}/{repo}/issues/{issue_number}/labels',
				{
					owner,
					repo,
					issue_number: number,
				},
			),
		),
		loadLookup('labels', failures, () =>
			listAll(
				github,
				'GET /repos/{owner}/{repo}/issues/{issue_number}/events',
				{
					owner,
					repo,
					issue_number: number,
				},
			),
		),
		loadLookup('workflow runs', failures, () =>
			listWorkflowRuns(github, owner, repo, { head_sha: headSha }),
		),
		loadLookup('linked issues', failures, () =>
			linkedIssues(github, owner, repo, number),
		),
		loadLookup('reviews', failures, () =>
			pullReviews(github, owner, repo, number),
		),
	])

	const files = filesPage.items ?? []
	const packageJsons = []
	if (!failures.includes('files')) {
		for (const file of files) {
			const paths = [file.filename, file.previous_filename].filter(
				(value) => typeof value === 'string' && isPackageJson(value),
			)
			for (const path of paths) {
				try {
					const before = await readFileAt(
						github,
						owner,
						repo,
						path,
						pr.base.sha,
					)
					const after = await readFileAt(github, owner, repo, path, headSha)
					if (before == null && after == null) continue
					packageJsons.push({
						path,
						before: before ?? '{}',
						after: after ?? '{}',
					})
				} catch {
					failures.push('files')
					break
				}
			}
			if (failures.includes('files')) break
		}
	}

	const runs = runsPage.items ?? []
	let commitAt = null
	if (!runs.some((run) => run.head_sha === headSha && run.created_at)) {
		try {
			const commit = await github.request(
				'GET /repos/{owner}/{repo}/commits/{ref}',
				{ owner, repo, ref: headSha },
			)
			commitAt = commit?.data?.commit?.committer?.date ?? null
			if (!commitAt) failures.push('workflow runs')
		} catch {
			failures.push('workflow runs')
			core.warning(`Could not read the commit date for ${headSha}.`)
		}
	}

	const events = eventsPage.items ?? []
	const fixupEvents = events.filter(
		(event) =>
			event?.event === 'labeled' && event?.label?.name === config.fixupLabel,
	)
	fixupEvents.sort(
		(left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
	)

	const comments = (commentsPage.items ?? []).map((comment) => ({
		body: comment.body,
		at: comment.created_at,
	}))
	if (commentFailures.length > 0) {
		core.warning(
			`Issue comments for #${number} were incomplete. A Discord notice may repeat.`,
		)
	}
	const reviews = (reviewsPage.nodes ?? []).map(mapReview)
	const issues = issuesPage.nodes ?? []
	const lookupIncomplete = failures.length > 0
	if (lookupIncomplete) {
		core.warning(
			`Lookup incomplete for #${number}: ${failures.join(', ')}. Not eligible.`,
		)
	}

	return {
		snapshot: {
			number,
			state: pr.state,
			draft: pr.draft === true,
			author: pr.user?.login ?? '',
			base: pr.base?.ref,
			headRef: pr.head?.ref,
			headSha,
			headRepo: pr.head?.repo?.full_name ?? '',
			repo: fullName(owner, repo),
			title: pr.title ?? '',
			body: pr.body ?? '',
			labels: (labelsPage.items ?? []).map((label) => label?.name ?? label),
			files,
			packageJsons,
			reviews,
			comments,
			linkedIssueBodies: issues.map((issue) => issue.body ?? ''),
			fixupLabelAddedAt: fixupEvents[0]?.created_at ?? null,
			lookupIncomplete,
		},
		runs: runs.map(mapRun),
		commitAt,
		issues,
		comments,
	}
}

async function mergePull(github, owner, repo, number, expectedSha, core) {
	const fresh = await github.request(
		'GET /repos/{owner}/{repo}/pulls/{pull_number}',
		{ owner, repo, pull_number: number },
	)
	const pull = fresh?.data
	if (!pull || pull.head?.sha !== expectedSha) {
		core.info(
			`Skipping #${number}: head is ${pull?.head?.sha ?? 'unknown'}, not ${expectedSha}.`,
		)
		return null
	}
	if (pull.state !== 'open' || pull.draft === true) {
		core.info(`Skipping #${number}: the pull request is no longer open.`)
		return null
	}
	if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
		core.warning(`Refusing to merge #${number}: head SHA is invalid.`)
		return null
	}
	try {
		const response = await github.request(
			'PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge',
			{
				owner,
				repo,
				pull_number: number,
				merge_method: 'squash',
				sha: expectedSha,
			},
		)
		const merged = response?.data
		if (merged?.merged !== true || !/^[0-9a-f]{40}$/.test(merged.sha ?? '')) {
			throw new Error(
				`Merge API did not report a squash commit for #${number}.`,
			)
		}
		core.info(`Squash-merged #${number} as ${merged.sha}.`)
		return merged.sha
	} catch (error) {
		const status = error?.status
		if (status === 405 || status === 409) {
			core.warning(`Skipping #${number}: merge was refused (${status}).`)
			return null
		}
		throw error
	}
}

async function dispatchPreview(github, owner, repo, number, core) {
	try {
		await github.request(
			'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
			{
				owner,
				repo,
				workflow_id: 'preview.yml',
				ref: 'main',
				inputs: {
					action: 'cleanup',
					target: 'pr',
					pr_number: String(number),
				},
			},
		)
		core.info(
			`Dispatched preview.yml cleanup on main (action=cleanup, target=pr) for #${number}.`,
		)
	} catch {
		core.warning(
			`Failed to dispatch preview cleanup for #${number}. The squash merge stands.`,
		)
	}
}

async function dispatchDeploy(github, owner, repo, mergeSha, core) {
	if (!/^[0-9a-f]{40}$/.test(mergeSha)) {
		throw new Error('Refusing to dispatch deploy: merge SHA is invalid.')
	}
	const response = await github.request(
		'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',
		{
			owner,
			repo,
			workflow_id: 'deploy.yml',
			event: 'workflow_dispatch',
			head_sha: mergeSha,
			per_page: 5,
		},
	)
	const runs = response?.data?.workflow_runs ?? []
	const covered = runs.some(
		(run) => ACTIVE_DEPLOY.has(run.status) || run.conclusion === 'success',
	)
	if (covered) {
		core.info(`Production deploy already queued or succeeded for ${mergeSha}.`)
		return
	}
	await github.request(
		'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
		{
			owner,
			repo,
			workflow_id: 'deploy.yml',
			ref: 'main',
			inputs: { mode: 'production' },
		},
	)
	core.info(`Dispatched deploy.yml on main (mode=production) for ${mergeSha}.`)
}

function loadConfig() {
	const raw = process.env.AUTOMERGE_CONFIG
	if (typeof raw !== 'string' || raw.length === 0) {
		throw new Error('AUTOMERGE_CONFIG is required')
	}
	try {
		return JSON.parse(raw)
	} catch {
		throw new Error('AUTOMERGE_CONFIG is not valid JSON')
	}
}

export default async function run({ github, context, core, now }) {
	if (!github || typeof github.request !== 'function') {
		throw new Error('github.request is required')
	}
	const config = loadConfig()
	const { owner, repo } = repositoryOf(context)
	const openPulls = await listAll(github, 'GET /repos/{owner}/{repo}/pulls', {
		owner,
		repo,
		state: 'open',
		base: config.base,
	})
	if (openPulls.truncated) {
		core.warning(
			'The open pull request list was truncated. Unlisted pull requests were not merged.',
		)
	}
	const pulls = openPulls.items
	const merged = []
	const mergeShas = []
	const clock =
		typeof now === 'string' && now.length > 0 ? now : new Date().toISOString()

	for (const pull of pulls) {
		if (pull?.base?.ref !== config.base) continue
		let gathered
		try {
			gathered = await gather(github, owner, repo, pull, config, core)
		} catch {
			core.warning(
				`Skipping #${pull?.number ?? '?'}: the pull request data was incomplete, so it was not merged.`,
			)
			continue
		}
		const decision = evaluate({
			config,
			now: clock,
			commitAt: gathered.commitAt,
			runs: gathered.runs,
			pr: gathered.snapshot,
		})
		core.info(
			`#${pull.number} ${decision.decision}${decision.reasons.length ? `: ${decision.reasons.join('; ')}` : ''}`,
		)
		if (decision.decision === 'merge') {
			let mergeSha = null
			try {
				mergeSha = await mergePull(
					github,
					owner,
					repo,
					pull.number,
					gathered.snapshot.headSha,
					core,
				)
			} catch {
				core.warning(
					`#${pull.number}: the head could not be re-read, so it was not merged.`,
				)
				const blocked = evaluate({
					config,
					now: clock,
					commitAt: gathered.commitAt,
					runs: gathered.runs,
					pr: { ...gathered.snapshot, lookupIncomplete: true },
				})
				if (blocked.discordState) {
					await notify(
						github,
						owner,
						repo,
						gathered.snapshot,
						blocked.discordState,
						blocked.reasons,
						gathered.comments,
						core,
					)
				}
				continue
			}
			if (!mergeSha) continue
			await closeLinked(github, owner, repo, pull.number, gathered.issues, core)
			await notify(
				github,
				owner,
				repo,
				gathered.snapshot,
				'merged',
				['squash merge'],
				gathered.comments,
				core,
			)
			await dispatchPreview(github, owner, repo, pull.number, core)
			merged.push(pull.number)
			mergeShas.push(mergeSha)
			continue
		}
		if (decision.discordState) {
			await notify(
				github,
				owner,
				repo,
				gathered.snapshot,
				decision.discordState,
				decision.reasons,
				gathered.comments,
				core,
			)
		}
	}

	const dispatched = new Set()
	for (const mergeSha of mergeShas) {
		if (dispatched.has(mergeSha)) continue
		dispatched.add(mergeSha)
		await dispatchDeploy(github, owner, repo, mergeSha, core)
	}
	return { merged }
}
