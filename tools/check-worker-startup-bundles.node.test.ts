import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { expect, test } from 'vitest'
import { consoleWarn } from '#worker/test-support/console-spies.ts'
import {
	collectStartupBundleOverages,
	loadStartupBundleOverageAttribution,
	readStartupBundleBudget,
	startupEntryNeedsAttribution,
} from './check-worker-startup-bundles.ts'

test('bundle budget file rejects non-integer and infinite ceilings', async () => {
	const dir = await mkdtemp(path.join(tmpdir(), 'startup-bundle-budget-'))
	try {
		const budgetPath = path.join(dir, 'budget.json')
		await writeFile(
			budgetPath,
			JSON.stringify({
				origin: 1,
				platform: Number.POSITIVE_INFINITY,
				runtime: 1,
			}),
		)
		await expect(readStartupBundleBudget(budgetPath)).rejects.toThrow(
			/Invalid startup bundle budget for platform/,
		)
		await writeFile(
			budgetPath,
			JSON.stringify({ origin: 1.5, platform: 1, runtime: 1 }),
		)
		await expect(readStartupBundleBudget(budgetPath)).rejects.toThrow(
			/Invalid startup bundle budget for origin/,
		)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test('byte overages are collected for reporting instead of treated as fatal', () => {
	expect(
		collectStartupBundleOverages([
			{ name: 'runtime', size: 3_912_588, maxEntryBytes: 3_912_500 },
		]),
	).toHaveLength(1)
	expect(
		collectStartupBundleOverages([
			{ name: 'runtime', size: 3_912_500, maxEntryBytes: 3_912_500 },
		]),
	).toEqual([])
})

test('in-budget CI runs skip source-map attribution', () => {
	expect(startupEntryNeedsAttribution(false, false)).toBe(false)
	expect(startupEntryNeedsAttribution(false, true)).toBe(true)
	expect(startupEntryNeedsAttribution(true, false)).toBe(true)
})

const vlqAlphabet =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function encodeVlq(value: number) {
	let vlq = value < 0 ? (-value << 1) | 1 : value << 1
	let encoded = ''
	do {
		let digit = vlq & 31
		vlq >>= 5
		if (vlq > 0) digit |= 32
		encoded += vlqAlphabet[digit]
	} while (vlq > 0)
	return encoded
}

function mappingSegment(generatedColumn: number, sourceIndex = 0) {
	return [
		encodeVlq(generatedColumn),
		encodeVlq(sourceIndex),
		encodeVlq(0),
		encodeVlq(0),
	].join('')
}

function sourceMap(sources: Array<string>, mappings: string) {
	return JSON.stringify({ version: 3, sources, mappings })
}

test('overage attribution reads the built entry and an optional previous outdir', async () => {
	const dir = await mkdtemp(path.join(tmpdir(), 'startup-bundle-attr-'))
	try {
		const entryPath = path.join(dir, 'runtime-worker.js')
		const sourceMapPath = `${entryPath}.map`
		await writeFile(entryPath, 'aaaabbbb')
		await writeFile(
			sourceMapPath,
			sourceMap(
				['packages/worker/src/a.ts', 'packages/worker/src/b.ts'],
				`${mappingSegment(0, 0)},${mappingSegment(4, 1)}`,
			),
		)
		const current = await loadStartupBundleOverageAttribution(
			{ name: 'runtime', entryPath, sourceMapPath },
			null,
		)
		expect(current).toEqual({
			sources: [
				{ source: 'packages/worker/src/a.ts', bytes: 4 },
				{ source: 'packages/worker/src/b.ts', bytes: 4 },
			],
		})

		const baseRoot = path.join(dir, 'base')
		await mkdir(path.join(baseRoot, 'runtime'), { recursive: true })
		const baseEntry = path.join(baseRoot, 'runtime', 'runtime-worker.js')
		await writeFile(baseEntry, 'aaaa')
		await writeFile(
			`${baseEntry}.map`,
			sourceMap(['packages/worker/src/a.ts'], mappingSegment(0, 0)),
		)
		await writeFile(
			path.join(baseRoot, 'artifacts.json'),
			`${JSON.stringify({
				runtime: {
					entryPath: 'runtime/runtime-worker.js',
					sourceMapPath: 'runtime/runtime-worker.js.map',
				},
			})}\n`,
		)
		const compared = await loadStartupBundleOverageAttribution(
			{ name: 'runtime', entryPath, sourceMapPath },
			baseRoot,
		)
		expect(compared?.outdirDeltas?.[0]).toMatchObject({
			source: 'packages/worker/src/b.ts',
			delta: 4,
		})
		expect(compared?.outdirDeltas?.some((entry) => entry.delta === 0)).toBe(
			true,
		)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})

test('a missing entry or baseline does not drop the overage report', async () => {
	consoleWarn.mockImplementation(() => {})
	const missing = await loadStartupBundleOverageAttribution(
		{
			name: 'runtime',
			entryPath: path.join(tmpdir(), 'does-not-exist-startup-entry.js'),
			sourceMapPath: path.join(tmpdir(), 'does-not-exist-startup-entry.js.map'),
		},
		null,
	)
	expect(missing).toBeNull()
	expect(consoleWarn).toHaveBeenCalled()
	expect(String(consoleWarn.mock.calls[0]?.[0])).toMatch(/attribution failed/)

	const dir = await mkdtemp(path.join(tmpdir(), 'startup-bundle-attr-miss-'))
	try {
		consoleWarn.mockClear()
		const entryPath = path.join(dir, 'runtime-worker.js')
		const sourceMapPath = `${entryPath}.map`
		await writeFile(entryPath, 'aaaa')
		await writeFile(
			sourceMapPath,
			sourceMap(['packages/worker/src/a.ts'], mappingSegment(0, 0)),
		)
		const partial = await loadStartupBundleOverageAttribution(
			{ name: 'runtime', entryPath, sourceMapPath },
			path.join(dir, 'missing-base'),
		)
		expect(partial).toEqual({
			sources: [{ source: 'packages/worker/src/a.ts', bytes: 4 }],
		})
		expect(String(consoleWarn.mock.calls[0]?.[0])).toMatch(
			/baseline attribution failed/,
		)
	} finally {
		await rm(dir, { recursive: true, force: true })
	}
})
