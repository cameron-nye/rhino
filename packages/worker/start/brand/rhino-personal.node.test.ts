import { expect, test } from 'vitest'
import { orgOverviewPath } from '#universal/org-pages.ts'
import {
	isRhinoMarketingPath,
	rhinoPersonalHomeHref,
	rhinoPublicLinkVisible,
} from './rhino-personal.ts'

test('marketing paths redirect and auth, legal, health, and package routes stay', () => {
	for (const path of [
		'/',
		'/pricing/',
		'/blog',
		'/blog/hello',
		'/blog/rss.xml',
		'/blog/hello.md',
		'/features',
		'/features/secrets',
		'/community',
		'/community/listing',
		'/docs',
		'/docs/what-is-kody',
		'/docs/what-is-kody.md',
		'/docs/connect',
		'/docs/llms.txt',
		'/llms.txt',
		'/faq',
		'/about',
		'/use-cases/mcp-gateway',
		'/compare/n8n-alternatives',
		'/integrations/slack',
		'/for/business',
		'/with/claude',
		'/guides',
		'/guides/what-is-kody',
		'/guides.json',
	]) {
		expect(isRhinoMarketingPath(path), path).toBe(true)
		expect(rhinoPublicLinkVisible(path), path).toBe(false)
	}

	for (const path of [
		'/login',
		'/signup',
		'/privacy',
		'/terms',
		'/health',
		'/health/components',
		'/mcp',
		'/oauth/callback',
		'/oauth/authorize',
		'/auth',
		'/auth.md',
		'/account',
		'/@jane/-/overview',
		'/@jane/pkg',
		'/docs/admin-events',
		'/docs/admin-events.md',
		'/docs/missing-guide',
		'/guides/admin-events',
		'/integrations/logos/github',
		'/integrations/provider-marks/google',
		'/connect/oauth',
		'/session',
		'/onboarding',
		'/verify-email',
		'/reset-password',
		'/join/token',
		'/unsubscribe/tips',
	]) {
		expect(isRhinoMarketingPath(path), path).toBe(false)
	}

	expect(rhinoPublicLinkVisible('https://github.com/kody-hq/kody')).toBe(true)
	expect(rhinoPublicLinkVisible('/privacy')).toBe(true)
	expect(rhinoPublicLinkVisible('/admin/users')).toBe(true)
})

test('personal-use home is login or the workspace dashboard', () => {
	expect(rhinoPersonalHomeHref({ signedIn: false, personalSlug: null })).toBe(
		'/login',
	)
	expect(
		rhinoPersonalHomeHref({ signedIn: true, personalSlug: 'cameron' }),
	).toBe(orgOverviewPath('cameron'))
	expect(rhinoPersonalHomeHref({ signedIn: true, personalSlug: null })).toBe(
		'/account',
	)
	expect(
		rhinoPersonalHomeHref({ signedIn: true, personalSlug: 'not a slug' }),
	).toBe('/account')
})
