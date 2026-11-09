import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	ecpRootPublicKeys,
	ecpTestRootPublicKey,
	verifyServerKeySet,
} from '@kody-internal/shared/execution-context-protocol/index.ts'
import {
	fetchServerKeys,
	serverKeyRootsFor,
} from '../src/execution-context/client.js'

const vectorsDir = join(
	import.meta.dirname,
	'..',
	'..',
	'shared',
	'src',
	'execution-context-protocol',
	'vectors',
)
const testKeySet = JSON.parse(
	readFileSync(join(vectorsDir, 'signing.json'), 'utf8'),
).keySet.document as { k: string }
const testKeys = JSON.parse(
	readFileSync(join(vectorsDir, 'test-keys.json'), 'utf8'),
)

const trust = { KODY_ECP_TRUST_TEST_ROOT: '1' }
const serve: typeof fetch = async () => Response.json(testKeySet)
const fetchKeys = (apiUrl: string, env: NodeJS.ProcessEnv) =>
	fetchServerKeys({ apiUrl, env, fetchFn: serve })

test('the test root is the committed test-keys.json root, never a pinned root', () => {
	assert.equal(testKeySet.k, 'root-test-1')
	assert.deepEqual(ecpTestRootPublicKey, {
		kid: testKeys.root.kid,
		x: testKeys.root.privateKeyJwk.x,
	})
	assert.ok(!ecpRootPublicKeys.some((root) => root.kid === 'root-test-1'))
})

test('KODY_ECP_TRUST_TEST_ROOT=1 trusts the test root for workers.dev previews and localhost', async () => {
	for (const apiUrl of [
		'https://kody-pr-1-api.example.workers.dev',
		'http://localhost:8787',
		'https://LOCALHOST:3000',
	]) {
		const keys = await fetchKeys(apiUrl, trust)
		assert.deepEqual(
			keys.map((key) => key.kid),
			['ecp-frame-test-1'],
			apiUrl,
		)
	}
})

test('the test root is ignored for kody.codes and every other host, even with the variable set', async () => {
	for (const apiUrl of [
		'https://kody.codes',
		'https://api.kody.codes',
		'https://kody.codes.workers.dev.example.com',
		'https://workers.dev',
		'http://kody-pr-1-api.example.workers.dev',
		'http://127.0.0.1:8787',
		'https://evil.localhost.example.com',
	]) {
		assert.deepEqual(
			serverKeyRootsFor(apiUrl, trust),
			ecpRootPublicKeys,
			apiUrl,
		)
		await assert.rejects(
			fetchKeys(apiUrl, trust),
			/failed root signature verification/,
			apiUrl,
		)
	}
})

test('the test root is ignored unless KODY_ECP_TRUST_TEST_ROOT is exactly 1', async () => {
	const preview = 'https://kody-pr-1-api.example.workers.dev'
	for (const env of [
		{},
		{ KODY_ECP_TRUST_TEST_ROOT: '' },
		{ KODY_ECP_TRUST_TEST_ROOT: '0' },
		{ KODY_ECP_TRUST_TEST_ROOT: 'true' },
	]) {
		assert.deepEqual(serverKeyRootsFor(preview, env), ecpRootPublicKeys)
		await assert.rejects(
			fetchKeys(preview, env),
			/failed root signature verification/,
		)
	}
})
const productionKeySet = JSON.parse(
	readFileSync(
		join(
			import.meta.dirname,
			'..',
			'..',
			'worker',
			'src',
			'execution-contexts',
			'server-keys.production.json',
		),
		'utf8',
	),
) as { k: string }

test('ecpRootPublicKeys pins root-rhino-1, keeps root-1/root-2, excludes root-test-1', () => {
	const rhino = ecpRootPublicKeys.find((root) => root.kid === 'root-rhino-1')
	assert.ok(rhino)
	assert.equal(rhino.x, 'zFFzSb9rgMac1PfrrP_LvBOPMEx87-wlB1iCwUXbZq8')
	assert.ok(ecpRootPublicKeys.some((root) => root.kid === 'root-1'))
	assert.ok(ecpRootPublicKeys.some((root) => root.kid === 'root-2'))
	assert.ok(!ecpRootPublicKeys.some((root) => root.kid === 'root-test-1'))
})

test('Rhino custom domain trusts pinned roots only; TRUST_TEST_ROOT does not add root-test-1', () => {
	const apiUrl = 'https://api.rhino.nyneelevenlabs.com'
	assert.deepEqual(serverKeyRootsFor(apiUrl, {}), ecpRootPublicKeys)
	assert.deepEqual(
		serverKeyRootsFor(apiUrl, { KODY_ECP_TRUST_TEST_ROOT: '1' }),
		ecpRootPublicKeys,
	)
	assert.ok(
		!serverKeyRootsFor(apiUrl, { KODY_ECP_TRUST_TEST_ROOT: '1' }).some(
			(root) => root.kid === 'root-test-1',
		),
	)
})

test('fetchServerKeys accepts Rhino production keyset on custom domain without TRUST_TEST_ROOT', async () => {
	const keys = await fetchServerKeys({
		apiUrl: 'https://api.rhino.nyneelevenlabs.com',
		env: {},
		fetchFn: (async () => Response.json(productionKeySet)) as typeof fetch,
	})
	assert.deepEqual(
		keys.map((key) => key.kid),
		['ecp-frame-rhino-2026-11'],
	)
})

test('Rhino production keyset fails closed without root-rhino-1 in the root list', async () => {
	assert.equal(productionKeySet.k, 'root-rhino-1')
	const filtered = ecpRootPublicKeys.filter(
		(root) => root.kid !== 'root-rhino-1',
	)
	const set = await verifyServerKeySet({
		document: productionKeySet,
		roots: filtered,
	})
	assert.equal(set, null)
})
test('expired Rhino frame key is filtered by fetchServerKeys now', async () => {
	const keys = await fetchServerKeys({
		apiUrl: 'https://api.rhino.nyneelevenlabs.com',
		env: {},
		now: 1857254400000 + 1,
		fetchFn: (async () => Response.json(productionKeySet)) as typeof fetch,
	})
	assert.deepEqual(keys, [])
})

test('malformed server-keys envelope fails closed on custom domain', async () => {
	await assert.rejects(
		fetchServerKeys({
			apiUrl: 'https://api.rhino.nyneelevenlabs.com',
			env: {},
			fetchFn: (async () =>
				Response.json({ p: 'x', s: 'y', k: 'root-rhino-1' })) as typeof fetch,
		}),
		/failed root signature verification/,
	)
})

test('committed production keyset JSON exposes only p/s/k public envelope fields', () => {
	assert.deepEqual(Object.keys(productionKeySet).sort(), ['k', 'p', 's'])
	assert.equal(
		JSON.stringify(productionKeySet).includes('"d"'),
		false,
		'public envelope must not embed private d',
	)
})

test('global pin: api.kody.codes roots include root-rhino-1; test keyset still fails without TRUST_TEST_ROOT', async () => {
	const roots = serverKeyRootsFor('https://api.kody.codes', {})
	assert.deepEqual(roots, ecpRootPublicKeys)
	assert.ok(roots.some((root) => root.kid === 'root-rhino-1'))
	await assert.rejects(
		fetchServerKeys({
			apiUrl: 'https://api.kody.codes',
			env: {},
			fetchFn: serve,
		}),
		/failed root signature verification/,
	)
})

test('verifyServerKeySet returns null for empty/malformed documents without throwing', async () => {
	assert.equal(await verifyServerKeySet({ document: null }), null)
	assert.equal(await verifyServerKeySet({ document: {} }), null)
	assert.equal(
		await verifyServerKeySet({
			document: { p: 'x', s: 'y', k: 'root-rhino-1' },
		}),
		null,
	)
})
