import { createServerFn } from '@tanstack/react-start'

function pageSearch(input: unknown) {
	return typeof input === 'string' ? input : ''
}

/** Same home as the document redirect, for client navigations. */
export const loadRhinoMarketingHome = createServerFn({ method: 'GET' })
	.validator(pageSearch)
	.handler(async ({ data: search }) => {
		const [
			{ env },
			{ getRequest, setResponseHeader },
			{ setAuthSessionSecret },
			{ getEnv },
			{ rhinoPersonalHome },
		] = await Promise.all([
			import('cloudflare:workers'),
			import('@tanstack/react-start/server'),
			import('../../src/app/auth-session.ts'),
			import('../../src/app/env.ts'),
			import('./rhino-marketing-redirect.ts'),
		])
		const appEnv = getEnv(env)
		setAuthSessionSecret(appEnv.COOKIE_SECRET)
		const home = await rhinoPersonalHome(getRequest(), appEnv, search)
		if (home.setCookie) setResponseHeader('Set-Cookie', home.setCookie)
		return { href: home.href }
	})
