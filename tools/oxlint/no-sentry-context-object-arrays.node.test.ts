import { spawnSync } from 'node:child_process'
import { rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'

const repoRoot = path.resolve(import.meta.dirname, '../..')
const ruleName = 'no-sentry-context-object-arrays'
const diagnostic = `kody-custom(${ruleName})`

async function lint(lines: Array<string>) {
	const fixturePath = path.join(
		os.tmpdir(),
		`${ruleName}-${String(process.pid)}-${String(Date.now())}.ts`,
	)
	await writeFile(fixturePath, [...lines, ''].join('\n'))
	try {
		const result = spawnSync(
			path.join(repoRoot, 'node_modules', 'oxlint', 'bin', 'oxlint'),
			[fixturePath],
			{ cwd: repoRoot, encoding: 'utf8' },
		)
		return {
			output: `${result.stdout}\n${result.stderr}`,
			status: result.status,
		}
	} finally {
		await rm(fixturePath, { force: true })
	}
}

test('oxlint rejects setContext payloads with arrays of objects', async () => {
	const bad = await lint([
		"import * as Sentry from '@sentry/cloudflare'",
		"scope.setContext('job_schedule_watchdog', { overdueSample: [{ jobId: 'x' }] })",
	])
	expect(bad.output.split(diagnostic).length - 1).toBe(1)
	expect(bad.status).not.toBe(0)

	const good = await lint([
		"import * as Sentry from '@sentry/cloudflare'",
		"scope.setContext('job_schedule_watchdog', { overdueSampleLines: ['jobId=x'] })",
	])
	expect(good.output).not.toContain(diagnostic)
	expect(good.status).toBe(0)
})
