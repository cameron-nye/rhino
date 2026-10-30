import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

import { planProductionJobsWorkerConfig } from './jobs-worker-resources.ts'
import { parseJsonc } from './resource-utils.ts'

function productionServices(config: Record<string, unknown>) {
	const env = config.env as {
		production?: { services?: Array<{ binding?: string; service?: string }> }
	}
	return env.production?.services
}

test('production jobs plan creates JobManager in place and defers HOST when origin is missing', () => {
	const config = parseJsonc<Record<string, unknown>>(
		readFileSync('packages/jobs-worker/wrangler.jsonc', 'utf8'),
	)
	const committed = structuredClone(config)
	const committedMigrations = committed.migrations as Array<{
		transferred_classes?: Array<{ from?: string; from_script?: string }>
	}>
	expect(committedMigrations[0]?.transferred_classes?.[0]).toMatchObject({
		from: 'JobManager',
		from_script: 'kody-production',
	})

	const missingOrigin = planProductionJobsWorkerConfig(config, {
		originScriptExists: false,
	})
	expect(missingOrigin.deferHostBinding).toBe(true)
	expect(config.migrations).toEqual([
		{ tag: 'v1', new_sqlite_classes: ['JobManager'] },
	])
	expect(productionServices(config)).toEqual([
		{
			binding: 'HOST',
			service: 'kody-production',
			entrypoint: 'JobsHost',
		},
	])
	expect(missingOrigin.bootstrapConfig).not.toBeNull()
	expect(
		productionServices(
			missingOrigin.bootstrapConfig as Record<string, unknown>,
		),
	).toBeUndefined()
	expect(missingOrigin.bootstrapConfig?.migrations).toEqual(config.migrations)

	const originExists = planProductionJobsWorkerConfig(structuredClone(config), {
		originScriptExists: true,
	})
	expect(originExists.deferHostBinding).toBe(false)
	expect(originExists.bootstrapConfig).toBeNull()
})
