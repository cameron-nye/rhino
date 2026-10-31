import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const workflowPath = path.join(
	import.meta.dirname,
	'../../.github/workflows/deploy.yml',
)

function splitJobs(text: string) {
	const lines = text.split('\n')
	const jobs: Array<{ name: string; body: string }> = []
	let current: { name: string; lines: Array<string> } | null = null
	for (const line of lines) {
		const match = /^ {2}([a-z0-9_-]+):$/.exec(line)
		if (match?.[1]) {
			if (current)
				jobs.push({ name: current.name, body: current.lines.join('\n') })
			current = { name: match[1], lines: [] }
			continue
		}
		current?.lines.push(line)
	}
	if (current) jobs.push({ name: current.name, body: current.lines.join('\n') })
	return jobs
}

function scanBlock(body: string) {
	const start = body.indexOf('WRANGLER_LOG_SCAN_SECRETS:')
	if (start === -1) return null
	const end = body.indexOf('\n        run:', start)
	return body.slice(start, end === -1 ? undefined : end)
}

test('deploy.yml never serializes the whole secrets context', () => {
	const text = readFileSync(workflowPath, 'utf8')
	expect(text).not.toMatch(/toJSON\(\s*secrets\s*\)/)
})

test('each wrangler log scan lists every secret its job uses', () => {
	const text = readFileSync(workflowPath, 'utf8')
	const jobs = splitJobs(text).filter((job) =>
		job.body.includes('collect-wrangler-logs.ts'),
	)
	expect(jobs.length).toBeGreaterThan(0)
	for (const job of jobs) {
		const block = scanBlock(job.body)
		expect({ job: job.name, hasScanBlock: block !== null }).toEqual({
			job: job.name,
			hasScanBlock: true,
		})
		if (block === null) continue
		const used = new Set(
			[...job.body.matchAll(/secrets\.([A-Z][A-Z0-9_]*)/g)].map(
				(match) => match[1],
			),
		)
		const scanned = new Set(
			[...block.matchAll(/toJSON\(secrets\.([A-Z][A-Z0-9_]*)\)/g)].map(
				(match) => match[1],
			),
		)
		expect({
			job: job.name,
			missing: [...used].filter((name) => !scanned.has(name)),
		}).toEqual({ job: job.name, missing: [] })
	}
})

test('production origin secret sync requires Turnstile keys', () => {
	const text = readFileSync(workflowPath, 'utf8')
	const deploy = splitJobs(text).find((job) => job.name === 'deploy')
	expect(deploy).toBeTruthy()
	const sync = deploy?.body.slice(
		deploy.body.indexOf('🔐 Sync Cloudflare Secrets (bulk)'),
		deploy.body.indexOf('🔐 Sync Cloudflare Secrets to runtime worker'),
	)
	expect(sync).toContain('--set-from-env\n          TURNSTILE_SITE_KEY')
	expect(sync).toContain('--set-from-env TURNSTILE_SECRET_KEY')
	expect(sync).not.toContain('--set-from-env-optional TURNSTILE_')
	expect(sync).toContain(
		'TURNSTILE_SITE_KEY: ${{ secrets.TURNSTILE_SITE_KEY }}',
	)
	expect(sync).toContain(
		'TURNSTILE_SECRET_KEY: ${{ secrets.TURNSTILE_SECRET_KEY }}',
	)
})
