import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { expect, test } from 'vitest'
import { LoginPage } from './pages/login.tsx'
import { renderStartPage } from './test-support/render-start-page.ts'
import {
	authFormHydrationProbeScript,
	injectTrailingAuthFormNode,
	passwordManagerHydrationNode,
} from './test-support/auth-form-hydration-html.ts'

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

test('trailing auth-form injection lands on the real form, not a script copy', () => {
	const html = [
		'<script>const sample = "<form data-public-auth-form><button>Ignore</button></form>"</script>',
		'<form data-public-auth-form method="post"><button>Sign in</button></form>',
		'<form method="post"><button>Other</button></form>',
	].join('')
	const patched = injectTrailingAuthFormNode(html)
	expect(patched).toContain(
		`<button>Sign in</button>${passwordManagerHydrationNode}</form>`,
	)
	expect(patched).toContain('<button>Ignore</button></form>')
	expect(patched).toContain('<button>Other</button></form>')
	expect(patched.match(/data-pm-inject/g)).toEqual(['data-pm-inject'])
})

test('hydration probe runs after the auth form and removes itself before hydrate', () => {
	const html =
		'<main><form data-public-auth-form><button>Sign in</button></form><p>after</p></main>'
	const patched = injectTrailingAuthFormNode(
		html,
		authFormHydrationProbeScript('abc123'),
	)
	const form = patched.match(/<form\b[\s\S]*?<\/form>/)?.[0]
	expect(form).toContain(passwordManagerHydrationNode)
	expect(form).not.toContain('<script')
	expect(patched).toContain('</form><script nonce="abc123">')
	expect(patched).toContain('document.currentScript.remove()')
	expect(patched).toContain(
		'document.documentElement.getAttribute("data-hydrated")!=="true"',
	)
	expect(patched).toContain('<p>after</p>')
	expect(() => authFormHydrationProbeScript('abc"></script><script>')).toThrow(
		/nonce/,
	)
})

test('trailing auth-form injection refuses a document with no public auth form', () => {
	expect(() =>
		injectTrailingAuthFormNode('<form><button>Sign in</button></form>'),
	).toThrow(/data-public-auth-form/)
})

test('server-rendered login form receives the password-manager node as its last child', async () => {
	const html = await renderStartPage(
		createElement(LoginPage, {
			mode: 'login',
			currentHref: '/login',
			authConfig: { turnstileSiteKey: null, providers: [] },
		}),
		'/login',
	)
	const patched = injectTrailingAuthFormNode(html)
	const form = patched.match(
		/<form\b[^>]*\bdata-public-auth-form\b[^>]*>[\s\S]*?<\/form>/,
	)?.[0]
	expect(form).toBeTruthy()
	expect(form).toContain('>Sign in<')
	expect(form?.endsWith(`${passwordManagerHydrationNode}</form>`)).toBe(true)
	expect(form?.indexOf('>Sign in<')).toBeLessThan(
		form?.indexOf(passwordManagerHydrationNode) ?? -1,
	)
})
