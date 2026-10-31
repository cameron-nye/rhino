import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import {
	consoleError,
	silenceExpectedConsoleErrors,
} from '#worker/test-support/console-spies.ts'
import {
	classifyOriginProductionScriptState,
	durableObjectClassesConfiguredByMigrations,
	inspectOriginProductionScriptState,
	getCloudflareWorkerScriptExists,
	isCloudflareNotFoundError,
	isCloudflareOkNonJsonError,
	localDurableObjectClassNames,
	migrationsForDurableObjectTarget,
	omitLocalDurableObjectBindingsWithoutMigration,
	originBootstrapConfigPath,
	planOriginPreviewDeploy,
	planOriginProductionDeploy,
	platformOwnedClassNames,
	previewFleetScriptNames,
	productionOriginScriptName,
	productionOriginBootstrapWorkflowName,
	productionPlatformScriptName,
	productionRuntimeScriptName,
	runtimeOwnedClassNames,
	stripOriginBindingsForLocallyOwnedClasses,
	stripOriginCrossScriptClassBindings,
	stripOriginDurableObjectMigrations,
	writeOriginBootstrapWranglerConfig,
	createTransferredDurableObjectClassesInPlace,
	type DurableObjectNamespaceOwnership,
} from './origin-production-deploy-state.ts'
import { planProductionJobsWorkerConfig } from './jobs-worker-resources.ts'
import { removeRuntimeReferencesFromPlatformEnv } from './platform-worker-config.ts'
import { parseJsonc } from './resource-utils.ts'
import { omitUnexportedRuntimeTransfer } from './runtime-worker-config.ts'

function ownership(
	script: string,
	className: string,
): DurableObjectNamespaceOwnership {
	return { script, className }
}

function transferredOn(script: string, classNames: ReadonlyArray<string>) {
	return classNames.map((className) => ownership(script, className))
}

const platformOn = (script: string) =>
	transferredOn(script, platformOwnedClassNames)
const runtimeOn = (script: string) =>
	transferredOn(script, runtimeOwnedClassNames)
const multipartBoundary =
	'fe71c953c6db05262becd226201515a4e42a8860e6be9669fec682876e63'
const multipartScript = () =>
	new Response(`--${multipartBoundary}`, {
		status: 200,
		headers: {
			'Content-Type': `multipart/form-data; boundary=${multipartBoundary}`,
		},
	})
const namespacesResponse = (result: Array<{ script: string; class: string }>) =>
	Response.json({ success: true, result, result_info: { total_pages: 1 } })
const inspect = (fetcher: typeof fetch) =>
	inspectOriginProductionScriptState({
		accountId: 'acct',
		apiToken: 'token',
		apiBaseUrl: 'https://cf.test',
		fetcher,
	})
const scriptNameOf = (binding: unknown) =>
	(binding as { script_name?: string }).script_name

test('classifies production fleet ownership into fresh, steady, or ambiguous deploy plans', () => {
	const origin = productionOriginScriptName
	const platform = productionPlatformScriptName
	const runtime = productionRuntimeScriptName
	const inPlace = {
		originEntry: 'slim',
		runOriginBootstrap: false,
		forcePlatformAndRuntime: true,
	}
	const cases: Array<
		[
			boolean | null,
			Array<DurableObjectNamespaceOwnership>,
			Record<string, unknown>,
		]
	> = [
		// Missing fleet with no namespaces.
		[false, [], { mode: 'fresh', plan: inPlace }],
		// Completed transfer.
		[
			true,
			[
				...platformOn(platform),
				...runtimeOn(runtime),
				ownership(origin, 'JobsHost'),
			],
			{
				mode: 'steady',
				plan: {
					originEntry: 'slim',
					runOriginBootstrap: false,
					forcePlatformAndRuntime: false,
				},
			},
		],
		// A missing origin is not fresh when platform already owns a class.
		[
			false,
			[ownership(platform, 'MCP')],
			{
				mode: 'ambiguous',
				plan: {
					originEntry: 'full',
					runOriginBootstrap: false,
					forcePlatformAndRuntime: false,
				},
			},
		],
		// Origin exists but nobody implements a transferred class: create in place.
		[true, [], { mode: 'fresh', plan: inPlace }],
		// Origin already owns the classes. Stay on the full entry so a slim
		// upload is not rejected; destinations still create their own classes.
		[
			true,
			[...platformOn(origin), ...runtimeOn(origin)],
			{
				mode: 'fresh',
				originOwnedTransferredClassNames: [
					...platformOwnedClassNames,
					...runtimeOwnedClassNames,
				],
				plan: {
					originEntry: 'full',
					runOriginBootstrap: false,
					forcePlatformAndRuntime: true,
				},
			},
		],
		// Refuses to slim while origin still owns a transferred class.
		[
			true,
			[
				...platformOn(platform),
				...runtimeOn(runtime),
				ownership(origin, 'Mailbox'),
			],
			{
				mode: 'ambiguous',
				originOwnedTransferredClassNames: ['Mailbox'],
				plan: { originEntry: 'full' },
			},
		],
		// Platform only partially transferred.
		[
			true,
			[ownership(platform, 'MCP'), ...runtimeOn(runtime)],
			{ mode: 'ambiguous' },
		],
		// Unknown origin-script probe is never fresh or steady.
		[null, [], { mode: 'ambiguous', plan: { runOriginBootstrap: false } }],
	]
	expect(
		cases.map(([originScriptExists, namespaces]) => {
			const state = classifyOriginProductionScriptState({
				originScriptExists,
				namespaces,
			})
			return { ...state, plan: planOriginProductionDeploy(state) }
		}),
	).toMatchObject(cases.map(([, , expected]) => expected))

	// Script existence is the fallback only when namespace listing is unavailable.
	const fallback: Array<[boolean, boolean, boolean, string]> = [
		[false, false, false, 'fresh'],
		[true, true, true, 'steady'],
		[true, false, true, 'ambiguous'],
	]
	expect(
		fallback.map(
			([originScriptExists, platformScriptExists, runtimeScriptExists]) =>
				classifyOriginProductionScriptState({
					originScriptExists,
					platformScriptExists,
					runtimeScriptExists,
					namespaces: null,
				}).mode,
		),
	).toEqual(fallback.map(([, , , mode]) => mode))
})

test('classifies a preview fleet by its own script names and always slims unless origin owns classes', () => {
	const scriptNames = previewFleetScriptNames('kody-pr-7')
	// Production-named ownership must be invisible to a preview probe.
	const productionOwnership = [
		...platformOn(productionPlatformScriptName),
		...runtimeOn(productionRuntimeScriptName),
	]
	const destinations = [
		...platformOn(scriptNames.platform),
		...runtimeOn(scriptNames.runtime),
	]
	const classify = (
		originScriptExists: boolean,
		namespaces: Array<DurableObjectNamespaceOwnership>,
	) =>
		classifyOriginProductionScriptState({
			originScriptExists,
			namespaces,
			scriptNames,
		})
	expect(classify(false, productionOwnership).mode).toBe('fresh')
	expect(classify(true, [...productionOwnership, ...destinations]).mode).toBe(
		'steady',
	)

	const freshState = classify(false, [])
	expect(freshState.mode).toBe('fresh')
	expect(planOriginPreviewDeploy(freshState)).toMatchObject({
		mode: 'fresh',
		originEntry: 'slim',
	})

	// A retried preview run (platform/runtime deployed, origin missing):
	// production would keep the full entry, but preview never owns a class on
	// origin, so ambiguity about the destinations does not change the upload.
	const retried = classify(false, destinations)
	expect(retried.mode).toBe('ambiguous')
	expect(planOriginProductionDeploy(retried).originEntry).toBe('full')
	expect(planOriginPreviewDeploy(retried).originEntry).toBe('slim')

	const steady = classify(true, [
		...destinations,
		ownership(scriptNames.origin, 'JobsHost'),
	])
	expect(steady.mode).toBe('steady')
	expect(planOriginPreviewDeploy(steady).originEntry).toBe('slim')

	// Pre-slim previews bootstrapped every class on origin and also created
	// them on platform/runtime, so all three scripts own namespaces.
	const legacy = classify(true, [
		...platformOn(scriptNames.origin),
		...runtimeOn(scriptNames.origin),
		...destinations,
	])
	expect(legacy.mode).toBe('ambiguous')
	const legacyPlan = planOriginPreviewDeploy(legacy)
	expect(legacyPlan.originEntry).toBe('full')
	expect(legacyPlan.reason).toContain('Origin still owns')
	expect(legacyPlan.reason).toContain('MCP')
})

test('stripOriginDurableObjectMigrations removes top-level and env migrations only', () => {
	const migrations = [{ tag: 'v1', new_sqlite_classes: ['MCP'] }]
	const config: Record<string, unknown> = {
		main: './src/production-worker.ts',
		migrations,
		durable_objects: { bindings: [] },
		env: {
			preview: { migrations, vars: { APP_ENV: 'preview' } },
			production: { migrations },
		},
	}
	const base = {
		main: './src/production-worker.ts',
		durable_objects: { bindings: [] },
	}
	expect(
		stripOriginDurableObjectMigrations(structuredClone(config), 'preview'),
	).toEqual({
		...base,
		env: {
			preview: { vars: { APP_ENV: 'preview' } },
			production: { migrations },
		},
	})
	expect(
		stripOriginDurableObjectMigrations(structuredClone(config), 'production'),
	).toEqual({
		...base,
		env: {
			preview: { migrations, vars: { APP_ENV: 'preview' } },
			production: {},
		},
	})
})

test('Cloudflare probe error classifiers match only 200 non-JSON and 404 failures', () => {
	const cases: Array<[(error: unknown) => boolean, string, boolean]> = [
		[
			isCloudflareOkNonJsonError,
			'Malformed Cloudflare response (200) for /workers/scripts/kody-runtime: --boundary',
			true,
		],
		[
			isCloudflareOkNonJsonError,
			'Malformed Cloudflare response (502) for /workers/scripts/kody-runtime: upstream',
			false,
		],
		[
			isCloudflareNotFoundError,
			'Cloudflare API request failed (404): workers.api.error.not_found',
			true,
		],
		[
			isCloudflareNotFoundError,
			'Cloudflare API request failed (500): upstream',
			false,
		],
	]
	expect(
		cases.filter(([fn, message, want]) => fn(new Error(message)) !== want),
	).toEqual([])
})

test('inspectOriginProductionScriptState probes scripts and ownership, failing closed on errors', async () => {
	await expect(
		getCloudflareWorkerScriptExists({
			accountId: 'acct',
			apiToken: 'token',
			scriptName: productionRuntimeScriptName,
			apiBaseUrl: 'https://cf.test',
			fetcher: async () => multipartScript(),
		}),
	).resolves.toBe(true)

	const steady = await inspect(async (input) =>
		String(input).includes('/workers/durable_objects/namespaces')
			? namespacesResponse([
					...platformOwnedClassNames.map((className) => ({
						script: productionPlatformScriptName,
						class: className,
					})),
					...runtimeOwnedClassNames.map((className) => ({
						script: productionRuntimeScriptName,
						class: className,
					})),
				])
			: multipartScript(),
	)
	expect(steady.mode).toBe('steady')

	const missing = await inspect(async (input) =>
		String(input).includes('/workers/durable_objects/namespaces')
			? namespacesResponse([])
			: Response.json(
					{ success: false, errors: [{ code: 10007, message: 'not found' }] },
					{ status: 404 },
				),
	)
	expect(missing.mode).toBe('fresh')

	silenceExpectedConsoleErrors([/^Retrying Cloudflare API GET \/workers\//])
	const failed = await inspect(async () => {
		throw new Error('fetch failed')
	})
	expect(failed.mode).toBe('ambiguous')
	expect(failed.reason).toContain('Cloudflare script probe failed')
	expect(consoleError).toHaveBeenCalledWith(
		expect.stringMatching(/^Retrying Cloudflare API GET \/workers\/scripts\//),
	)
})

test('bootstrap config keeps the full entry and locally owns transferred classes', async () => {
	const tempDir = await mkdtemp(
		path.join(os.tmpdir(), 'kody-origin-bootstrap-'),
	)
	try {
		const generated = {
			main: './src/production-worker.ts',
			env: {
				production: {
					durable_objects: {
						bindings: [
							{
								name: 'MCP_OBJECT',
								class_name: 'MCP',
								script_name: productionPlatformScriptName,
							},
							{
								name: 'STORAGE_RUNNER',
								class_name: 'StorageRunner',
								script_name: productionRuntimeScriptName,
							},
							{
								name: 'UNRELATED',
								class_name: 'Other',
								script_name: 'someone-else',
							},
						],
					},
					workflows: [
						{
							binding: 'DYNAMIC_CALLABLE_WORKFLOWS',
							class_name: 'DynamicCallableWorkflow',
							script_name: productionRuntimeScriptName,
						},
					],
					services: [
						{
							binding: 'RUNTIME_WORKER',
							service: productionRuntimeScriptName,
						},
						{ binding: 'JOBS', service: 'kody-jobs' },
						{ binding: 'HIGHLIGHT', service: 'kody-highlight' },
						{ binding: 'REPO_PUSH_QUEUE', service: 'kody-push-queue' },
					],
				},
			},
		}
		const outPath = path.join(tempDir, 'bootstrap.json')
		await writeOriginBootstrapWranglerConfig({
			generatedConfig: generated,
			outConfigPath: outPath,
		})
		const written = JSON.parse(await readFile(outPath, 'utf8')) as {
			main: string
			env: {
				production: {
					durable_objects: {
						bindings: Array<{ class_name: string; script_name?: string }>
					}
					workflows: Array<{ name?: string; script_name?: string }>
					services?: Array<{ binding: string; service: string }>
				}
			}
		}
		expect(written.main).toBe('./src/index.ts')
		expect(
			written.env.production.durable_objects.bindings.map((binding) => [
				binding.class_name,
				binding.script_name,
			]),
		).toEqual([
			['MCP', undefined],
			['StorageRunner', undefined],
			['Other', 'someone-else'],
		])
		expect(written.env.production.workflows[0]?.script_name).toBeUndefined()
		expect(written.env.production.workflows[0]?.name).toBe(
			productionOriginBootstrapWorkflowName,
		)
		expect(written.env.production.services).toEqual([
			{ binding: 'JOBS', service: 'kody-jobs' },
			{ binding: 'HIGHLIGHT', service: 'kody-highlight' },
			{ binding: 'REPO_PUSH_QUEUE', service: 'kody-push-queue' },
		])
		// The generated input is not mutated.
		expect(generated.main).toBe('./src/production-worker.ts')
		expect(
			scriptNameOf(generated.env.production.durable_objects.bindings[0]),
		).toBe(productionPlatformScriptName)
	} finally {
		await rm(tempDir, { recursive: true, force: true })
	}
})

test('strip helpers keep transferred destination bindings and no-op without matching script names', () => {
	const config = {
		env: {
			production: {
				durable_objects: {
					bindings: [
						{
							name: 'MCP_OBJECT',
							class_name: 'MCP',
							script_name: productionPlatformScriptName,
						},
						{
							name: 'STORAGE_RUNNER',
							class_name: 'StorageRunner',
							script_name: productionRuntimeScriptName,
						},
					],
				},
				workflows: [
					{
						binding: 'DYNAMIC_CALLABLE_WORKFLOWS',
						name: 'kody-runtime-dynamic-callable-workflows',
						class_name: 'DynamicCallableWorkflow',
						script_name: productionRuntimeScriptName,
					},
				],
			},
		},
	}
	const bindingScripts = () =>
		config.env.production.durable_objects.bindings.map(scriptNameOf)
	stripOriginCrossScriptClassBindings(config, new Set(['other-script']))
	expect(bindingScripts()).toEqual([
		productionPlatformScriptName,
		productionRuntimeScriptName,
	])

	stripOriginBindingsForLocallyOwnedClasses(config, ['StorageRunner'])
	expect(bindingScripts()).toEqual([productionPlatformScriptName, undefined])
	const workflow = config.env.production.workflows[0] as {
		name?: string
		script_name?: string
	}
	expect(workflow.script_name).toBeUndefined()
	expect(workflow.name).toBe(productionOriginBootstrapWorkflowName)
})

test('originBootstrapConfigPath writes beside the generated config and rejects other suffixes', () => {
	expect(
		originBootstrapConfigPath(
			'packages/worker/wrangler-production.generated.json',
		),
	).toBe('packages/worker/wrangler-production-bootstrap.generated.json')
	expect(() =>
		originBootstrapConfigPath('packages/worker/wrangler-production.json'),
	).toThrow(/\.generated\.json/)
})

test('origin bootstrap drops local Durable Object classes the migrations do not configure', async () => {
	const config = {
		migrations: [
			{
				tag: 'v1',
				new_sqlite_classes: ['Kept', 'RenamedFrom'],
				new_classes: ['Classic'],
			},
			{
				tag: 'v2',
				renamed_classes: [{ from: 'RenamedFrom', to: 'RenamedTo' }],
			},
			{ tag: 'v3', deleted_classes: ['Classic'] },
			{
				tag: 'v4',
				transferred_classes: [
					{ from: 'Moved', from_script: 'other', to: 'Moved' },
				],
			},
		],
		durable_objects: {
			bindings: [
				{ name: 'A', class_name: 'Kept' },
				{ name: 'B', class_name: 'RenamedFrom' },
				{ name: 'C', class_name: 'RenamedTo' },
				{ name: 'D', class_name: 'Classic' },
				{ name: 'E', class_name: 'Moved' },
				{ name: 'F', class_name: 'Missing' },
				{ name: 'G', class_name: 'Remote', script_name: 'elsewhere' },
			],
		},
		env: {
			production: {
				durable_objects: {
					bindings: [
						{
							name: 'MCP_OBJECT',
							class_name: 'MCP',
							script_name: productionPlatformScriptName,
						},
						{
							name: 'SESSION',
							class_name: 'ExecutionContextSessionV1',
							script_name: productionPlatformScriptName,
						},
						{ name: 'GONE', class_name: 'Gone' },
						{
							name: 'UNRELATED',
							class_name: 'Other',
							script_name: 'someone-else',
						},
					],
				},
				migrations: [
					{ tag: 'v1', new_sqlite_classes: ['MCP', 'Gone'] },
					{ tag: 'v2', deleted_classes: ['Gone'] },
				],
			},
		},
	}
	omitLocalDurableObjectBindingsWithoutMigration(config)
	expect(
		config.durable_objects.bindings.map((binding) => binding.class_name),
	).toEqual(['Kept', 'RenamedTo', 'Moved', 'Remote'])
	expect(
		config.env.production.durable_objects.bindings.map((binding) => [
			binding.class_name,
			'script_name' in binding ? binding.script_name : undefined,
		]),
	).toEqual([
		['MCP', productionPlatformScriptName],
		['ExecutionContextSessionV1', productionPlatformScriptName],
		['Other', 'someone-else'],
	])

	const tempDir = await mkdtemp(path.join(os.tmpdir(), 'kody-origin-do-omit-'))
	try {
		const outPath = path.join(tempDir, 'bootstrap.generated.json')
		await writeOriginBootstrapWranglerConfig({
			generatedConfig: config,
			outConfigPath: outPath,
		})
		const written = JSON.parse(await readFile(outPath, 'utf8')) as {
			env: {
				production: {
					durable_objects: {
						bindings: Array<{ class_name: string; script_name?: string }>
					}
				}
			}
		}
		expect(
			written.env.production.durable_objects.bindings.map((binding) => [
				binding.class_name,
				binding.script_name,
			]),
		).toEqual([
			['MCP', undefined],
			['Other', 'someone-else'],
		])
	} finally {
		await rm(tempDir, { recursive: true, force: true })
	}
})

test('fresh-account deploys only bind Durable Object classes their migrations configure', async () => {
	const files = (
		await listWranglerConfigs(path.join(repoRoot, 'packages'))
	).sort()
	const seen: Array<string> = []
	for (const file of files) {
		const relative = path.relative(repoRoot, file)
		seen.push(relative)
		const config = parseJsonc<Record<string, unknown>>(
			await readFile(file, 'utf8'),
		)
		if (relative === 'packages/worker/wrangler.jsonc') {
			assertFreshOriginSlimDeploy(config)
			continue
		}
		if (relative === 'packages/platform-worker/wrangler.jsonc') {
			assertFreshPlatformDeploy(config)
			continue
		}
		if (relative === 'packages/runtime-worker/wrangler.jsonc') {
			assertFreshRuntimeDeploy(config)
			continue
		}
		if (relative === 'packages/jobs-worker/wrangler.jsonc') {
			const plan = planProductionJobsWorkerConfig(config, {
				originScriptExists: false,
			})
			expect(plan.deferHostBinding).toBe(true)
			const bootstrap = plan.bootstrapConfig
			if (!bootstrap) throw new Error('jobs bootstrap config missing')
			const production = productionEnvOrRoot(bootstrap)
			expect(localDurableObjectClassNames(production)).toEqual(['JobManager'])
			expect(serviceBindingNames(production)).not.toContain('HOST')
			expect(bootstrap.migrations).toEqual([
				{ tag: 'v1', new_sqlite_classes: ['JobManager'] },
			])
			assertLocalClassesConfigured(bootstrap, production, relative)
			continue
		}
		const production = productionEnvOrRoot(config)
		assertLocalClassesConfigured(config, production, relative)
		if (production !== config) {
			assertLocalClassesConfigured(config, config, `${relative} top-level`)
		}
	}
	expect(seen).toEqual([
		'packages/api-docs-worker/wrangler.jsonc',
		'packages/api-worker/wrangler.jsonc',
		'packages/backup-control-plane/wrangler.jsonc',
		'packages/highlight-worker/wrangler.jsonc',
		'packages/jobs-worker/wrangler.jsonc',
		'packages/mock-servers/cloudflare/wrangler.jsonc',
		'packages/nx-cache/wrangler.jsonc',
		'packages/platform-worker/wrangler.jsonc',
		'packages/push-queue-worker/wrangler.jsonc',
		'packages/runtime-worker/wrangler.jsonc',
		'packages/start-routing-worker/wrangler.jsonc',
		'packages/status/wrangler.jsonc',
		'packages/worker/wrangler.jsonc',
	])
})

const repoRoot = path.resolve(import.meta.dirname, '../..')

function productionEnvOrRoot(config: Record<string, unknown>) {
	const env = config.env
	if (!env || typeof env !== 'object' || Array.isArray(env)) return config
	const production = (env as Record<string, unknown>).production
	if (
		!production ||
		typeof production !== 'object' ||
		Array.isArray(production)
	) {
		return config
	}
	return production as Record<string, unknown>
}

function assertLocalClassesConfigured(
	config: Record<string, unknown>,
	target: Record<string, unknown>,
	label: string,
) {
	const local = localDurableObjectClassNames(target)
	if (local.length === 0) return
	const migrations = migrationsForDurableObjectTarget(config, target)
	const configured = durableObjectClassesConfiguredByMigrations(migrations)
	const missing = local.filter((name) => !configured.has(name))
	if (!Array.isArray(migrations) || missing.length > 0) {
		throw new Error(
			`${label} binds ${missing.join(', ') || '(no class)'} without a Durable Object migration`,
		)
	}
}

function serviceBindingNames(target: Record<string, unknown>) {
	const services = target.services
	if (!Array.isArray(services)) return []
	return services.flatMap((entry) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
		const binding = (entry as Record<string, unknown>).binding
		return typeof binding === 'string' ? [binding] : []
	})
}

function durableObjectScriptNames(target: Record<string, unknown>) {
	const durableObjects = target.durable_objects
	if (
		!durableObjects ||
		typeof durableObjects !== 'object' ||
		Array.isArray(durableObjects)
	) {
		return []
	}
	const bindings = (durableObjects as Record<string, unknown>).bindings
	if (!Array.isArray(bindings)) return []
	return bindings.flatMap((entry) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
		const scriptName = (entry as Record<string, unknown>).script_name
		return typeof scriptName === 'string' ? [scriptName] : []
	})
}

function transferredClassNames(config: Record<string, unknown>) {
	const migrations = config.migrations
	if (!Array.isArray(migrations)) return []
	return migrations.flatMap((entry) => {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
		const transferred = (entry as Record<string, unknown>).transferred_classes
		if (!Array.isArray(transferred)) return []
		return transferred.flatMap((item) => {
			if (!item || typeof item !== 'object' || Array.isArray(item)) return []
			const from = (item as Record<string, unknown>).from
			return typeof from === 'string' ? [from] : []
		})
	})
}

function classScriptName(
	target: Record<string, unknown>,
	className: string,
): string | undefined {
	const durableObjects = target.durable_objects
	if (
		!durableObjects ||
		typeof durableObjects !== 'object' ||
		Array.isArray(durableObjects)
	) {
		return undefined
	}
	const bindings = (durableObjects as Record<string, unknown>).bindings
	if (!Array.isArray(bindings)) return undefined
	for (const entry of bindings) {
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
		const binding = entry as Record<string, unknown>
		if (binding.class_name !== className) continue
		return typeof binding.script_name === 'string'
			? binding.script_name
			: undefined
	}
	return undefined
}

test('fresh origin bootstrap runs only when production-resources asks for it', async () => {
	const source = await readFile(
		path.join(repoRoot, '.github/workflows/deploy.yml'),
		'utf8',
	)
	const marker = '- name: ☁️ Bootstrap fresh origin Worker (full entry)'
	const start = source.indexOf(marker)
	expect(start).toBeGreaterThan(-1)
	const nextStep = source.indexOf('\n      - name:', start + marker.length)
	const step = source.slice(start, nextStep === -1 ? undefined : nextStep)
	expect(step).toContain("origin_deploy_mode == 'fresh'")
	expect(step).toContain("origin_bootstrap == 'true'")
})

/**
 * Fresh-account order: platform creates its classes in place (bootstrap
 * drops runtime references), runtime creates its classes in place, then
 * the slim origin upload binds those classes by script_name and carries
 * no Durable Object migrations. Origin is not seeded: a transfer from
 * kody-production fails with Cloudflare 10074, and a later slim upload
 * would fail with 10064 if origin still owned the class.
 */
function assertFreshOriginSlimDeploy(config: Record<string, unknown>) {
	const state = classifyOriginProductionScriptState({
		originScriptExists: true,
		namespaces: [],
	})
	expect(state.mode).toBe('fresh')
	expect(planOriginProductionDeploy(state)).toMatchObject({
		mode: 'fresh',
		originEntry: 'slim',
		runOriginBootstrap: false,
		forcePlatformAndRuntime: true,
	})
	const slim = structuredClone(config)
	stripOriginDurableObjectMigrations(slim, 'production')
	const production = productionEnvOrRoot(slim)
	expect(localDurableObjectClassNames(production)).toEqual([])
	expect(Array.isArray(slim.migrations)).toBe(false)
	expect(serviceBindingNames(production)).toEqual(
		expect.arrayContaining(['RUNTIME_WORKER', 'JOBS', 'HIGHLIGHT']),
	)
	for (const className of platformOwnedClassNames) {
		expect(classScriptName(production, className)).toBe(
			productionPlatformScriptName,
		)
	}
	expect(classScriptName(production, 'ExecutionContextSessionV1')).toBe(
		productionPlatformScriptName,
	)
	for (const className of runtimeOwnedClassNames) {
		expect(classScriptName(production, className)).toBe(
			productionRuntimeScriptName,
		)
	}
}

function assertFreshPlatformDeploy(config: Record<string, unknown>) {
	const created = structuredClone(config)
	createTransferredDurableObjectClassesInPlace(created)
	createTransferredDurableObjectClassesInPlace(created)
	expect(transferredClassNames(created)).toEqual([])
	const withRuntime = structuredClone(created)
	const production = productionEnvOrRoot(created)
	removeRuntimeReferencesFromPlatformEnv(
		production,
		productionRuntimeScriptName,
	)
	expect(localDurableObjectClassNames(production).sort()).toEqual(
		[...platformOwnedClassNames, 'ExecutionContextSessionV1'].sort(),
	)
	expect(durableObjectScriptNames(production)).not.toContain(
		productionRuntimeScriptName,
	)
	assertLocalClassesConfigured(
		created,
		production,
		'packages/platform-worker/wrangler.jsonc',
	)
	const migrations = created.migrations as Array<Record<string, unknown>>
	expect(migrations[0]?.new_sqlite_classes).toEqual([
		...platformOwnedClassNames,
	])
	expect(migrations[1]?.new_sqlite_classes).toEqual([
		'ExecutionContextSessionV1',
	])
	expect(durableObjectScriptNames(productionEnvOrRoot(withRuntime))).toContain(
		productionRuntimeScriptName,
	)
}

function assertFreshRuntimeDeploy(config: Record<string, unknown>) {
	const created = structuredClone(config)
	omitUnexportedRuntimeTransfer(created, 'PackageServiceInstance')
	createTransferredDurableObjectClassesInPlace(created)
	expect(transferredClassNames(created)).toEqual([])
	const production = productionEnvOrRoot(created)
	expect(localDurableObjectClassNames(production).sort()).toEqual(
		[...runtimeOwnedClassNames].sort(),
	)
	assertLocalClassesConfigured(
		created,
		production,
		'packages/runtime-worker/wrangler.jsonc',
	)
	const migrations = created.migrations as Array<Record<string, unknown>>
	expect(migrations[0]?.new_sqlite_classes).toEqual([
		'PackageServiceInstance',
		...runtimeOwnedClassNames,
	])
	expect(migrations[1]?.deleted_classes).toEqual(['PackageServiceInstance'])
	expect(localDurableObjectClassNames(production)).not.toContain(
		'PackageServiceInstance',
	)
}

async function listWranglerConfigs(dir: string): Promise<Array<string>> {
	const entries = await readdir(dir, { withFileTypes: true })
	const files: Array<string> = []
	for (const entry of entries) {
		if (entry.name === 'node_modules' || entry.name === 'dist') continue
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			files.push(...(await listWranglerConfigs(full)))
		} else if (entry.name === 'wrangler.jsonc') files.push(full)
	}
	return files
}
