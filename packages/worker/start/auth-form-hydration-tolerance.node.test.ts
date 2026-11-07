import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const reconcileSource = readFileSync(
	resolve(
		import.meta.dirname,
		'../../../node_modules/@tanstack/redact/dist/dom/reconcile.js',
	),
	'utf8',
)

const loginSectionsSource = readFileSync(
	resolve(import.meta.dirname, './pages/login-sections.tsx'),
	'utf8',
)

test('public auth form opts into suppressHydrationWarning for extension-injected nodes', () => {
	expect(loginSectionsSource).toMatch(
		/data-public-auth-form[\s\S]*suppressHydrationWarning/,
	)
})

test('reconcile discards leftover hydration siblings when suppressHydrationWarning is set', () => {
	expect(reconcileSource).toMatch(
		/props\.suppressHydrationWarning[\s\S]*while \(cursor\.has\(\)\) cursor\.take\(\)/,
	)
})
