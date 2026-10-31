import { expect, test } from 'vitest'
import { landingTestimonialsStorySlug } from '#universal/landing-testimonials.ts'
import {
	createMcpClient,
	createUniqueTestUser,
	getSharedMcpE2eServer,
} from '../../../tools/mcp-test-support.ts'
import { loginToApp } from '../../../tools/mcp-oauth-client.ts'

async function document(path: string, cookie?: string) {
	const server = await getSharedMcpE2eServer()
	const url = new URL(path, server.origin)
	const response = await fetch(url, {
		headers: cookie ? { Cookie: cookie } : {},
		redirect: 'manual',
	})
	expect(response.status, `HTML ${url.href}`).toBe(200)
	expect(response.headers.get('Content-Type')).toContain('text/html')
	const html = (await response.text())
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
	expect(html).toContain('</html>')
	return { html, response, url }
}

async function expectMarketingRedirect(
	path: string,
	pathname: string,
	cookie?: string,
) {
	const server = await getSharedMcpE2eServer()
	const response = await fetch(new URL(path, server.origin), {
		headers: cookie ? { Cookie: cookie } : {},
		redirect: 'manual',
	})
	expect(response.status, path).toBe(302)
	const location = response.headers.get('Location')
	expect(location, path).toBeTruthy()
	const destination = new URL(location!, server.origin)
	expect(destination.origin).toBe(server.origin)
	expect(destination.pathname, path).toBe(pathname)
	await response.body?.cancel()
}

test('native document middleware preserves complete SSR streams on public and personalized requests', async () => {
	const server = await getSharedMcpE2eServer()
	const user = createUniqueTestUser()
	await server.ensureUser(user)
	const cookie = await loginToApp(server.origin, user)
	// These requests pass through the built Start middleware pipeline. Its
	// ownership reconciler must not dispose SSR when cache delivery wraps it.
	for (const headers of [new Headers(), new Headers({ Cookie: cookie })]) {
		for (let attempt = 0; attempt < 2; attempt++) {
			const response = await fetch(new URL('/privacy', server.origin), {
				headers,
			})
			expect(response.status).toBe(200)
			const html = await response.text()
			expect(html).toContain('</html>')
			expect(html).toContain('Connected accounts')
			const nonce = response.headers
				.get('Content-Security-Policy')
				?.match(/'nonce-([^']+)'/)?.[1]
			expect(nonce).toBeTruthy()
			expect(html).toContain(`nonce="${nonce}"`)
		}
	}
})

test('legacy team Secrets redirects to native Credentials and Agents remains authorized', async () => {
	const server = await getSharedMcpE2eServer()
	const user = createUniqueTestUser()
	await server.ensureUser(user)
	const cookie = await loginToApp(server.origin, user)
	const slug = `team-${user.username}`
	await using mcp = await createMcpClient(server.origin, user, {
		markEmailVerified: server.markEmailVerified,
		clearAuthRateLimits: server.clearAuthRateLimits,
	})
	const created = await mcp.client.callTool({
		name: 'execute',
		arguments: {
			code: `import { kody } from 'kody:runtime'
export default async function main(input) {
	return await kody.orgCreate({ slug: input.slug, display_name: 'Native team' })
}`,
			params: { slug },
		},
	})
	expect(created.isError).not.toBe(true)
	expect(created.structuredContent).toMatchObject({ result: { org: { slug } } })
	const legacy = await fetch(`${server.origin}/@${slug}/-/secrets`, {
		headers: { Cookie: cookie },
		redirect: 'manual',
	})
	expect(legacy.status).toBe(302)
	const credentialsPath = `/@${slug}/-/credentials?kind=secret`
	expect(legacy.headers.get('Location')).toBe(credentialsPath)
	const anonymous = await fetch(new URL(credentialsPath, server.origin), {
		redirect: 'manual',
	})
	expect(anonymous.status).toBe(302)
	expect(
		new URL(anonymous.headers.get('Location')!, server.origin).pathname,
	).toBe('/login')
	for (const [section, heading] of [
		['credentials?kind=secret', 'Credentials'],
		['agents', 'Agents'],
	]) {
		const { html } = await document(`/@${slug}/-/${section}`, cookie)
		expect(html).toMatch(new RegExp(`<h1[^>]*>${heading}</h1>`))
		expect(html).toContain('Native team')
		expect(html).not.toContain('data-testid="internal-error-page"')
	}
})

test.each([
	'/',
	'/pricing',
	'/blog',
	'/features',
	'/features/memory',
	'/features/secrets',
	'/docs',
	'/docs/what-is-kody',
	`/blog/${landingTestimonialsStorySlug}`,
	'/llms.txt',
])('anonymous %s redirects to login instead of rendering', async (path) => {
	await expectMarketingRedirect(path, '/login')
})

test('a referral on a marketing URL still sets kody_ref and does not render', async () => {
	const server = await getSharedMcpE2eServer()
	const response = await fetch(
		new URL('/features/secrets?ref=shared', server.origin),
		{ redirect: 'manual' },
	)
	expect(response.status).toBe(302)
	expect(
		new URL(response.headers.get('Location')!, server.origin).pathname,
	).toBe('/login')
	expect(response.headers.get('Cache-Control')).toBe('no-store')
	expect(response.headers.get('Set-Cookie')).toContain('kody_ref=shared;')
	await response.body?.cancel()
})

test('signed-in marketing paths open the workspace dashboard', async () => {
	const server = await getSharedMcpE2eServer()
	const user = createUniqueTestUser()
	await server.ensureUser(user)
	const cookie = await loginToApp(server.origin, user)
	for (const path of ['/', '/pricing', '/blog', '/docs/what-is-kody']) {
		await expectMarketingRedirect(path, `/@${user.username}/-/overview`, cookie)
	}
})
