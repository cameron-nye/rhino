/**
 * Rhino personal-use switch. Cameron signs in and uses his own workspace, so
 * the public marketing site redirects instead of rendering. Set this to
 * `false` to restore those pages. Upstream route files stay in place.
 *
 * Auth, OAuth, MCP, `/health`, legal pages, and package routes are not in
 * this list. Admin docs stay reachable; public guides do not.
 */
import { isPublicDocSlug } from '../page-access.ts'
import { isOrganizationSlug, orgOverviewPath } from '#universal/org-pages.ts'

export const rhinoPersonalUse = true

const marketingExact = new Set([
	'/',
	'/pricing',
	'/faq',
	'/about',
	'/brand-guide',
	'/contact',
	'/support',
	'/discord',
	'/believe',
	'/case-studies',
	'/llms.txt',
	'/integrations/claude',
	'/integrations/gmail',
	'/integrations/slack',
])

const marketingPrefixes = [
	'/blog',
	'/features',
	'/community',
	'/use-cases',
	'/compare',
	'/with',
	'/for',
] as const

function normalizePathname(pathname: string): string {
	const path = pathname.split(/[?#]/, 1)[0] ?? ''
	if (!path.startsWith('/') || path.startsWith('//')) return path
	const segments = path.split('/').map((segment) => {
		if (!segment.includes('%')) return segment
		try {
			const decoded = decodeURIComponent(segment)
			if (!decoded.includes('/') && !decoded.includes('\\')) return decoded
		} catch {
			// Keep a segment that is not valid percent-encoding.
		}
		return segment
	})
	const normalized = segments.join('/')
	return normalized.length > 1 && normalized.endsWith('/')
		? normalized.slice(0, -1)
		: normalized
}

function hasPathPrefix(path: string, prefix: string) {
	return path === prefix || path.startsWith(`${prefix}/`)
}

/** Public docs and their markdown, llms, and share-image twins. */
function isMarketingDocsPath(path: string) {
	if (
		path === '/docs' ||
		path === '/docs.md' ||
		path === '/docs/llms.txt' ||
		path === '/docs/connect' ||
		path === '/docs/connect.md' ||
		path.startsWith('/docs/connect/')
	) {
		return true
	}
	const slug =
		/^\/docs\/([^/]+)\.md$/.exec(path)?.[1] ??
		/^\/docs\/([^/]+)\/og\.png$/.exec(path)?.[1] ??
		/^\/docs\/([^/]+)$/.exec(path)?.[1]
	return slug ? isPublicDocSlug(slug) : false
}

/** Legacy `/guides` URLs follow the same public-vs-admin split as `/docs`. */
function isMarketingGuidesPath(path: string) {
	if (path === '/guides' || path === '/guides.md' || path === '/guides.json') {
		return true
	}
	if (!path.startsWith('/guides/')) return false
	const rest = path.slice('/guides/'.length)
	if (
		rest === 'connect' ||
		rest === 'connect.md' ||
		rest === 'connect.json' ||
		rest.startsWith('connect/')
	) {
		return true
	}
	const twin = /^([^/]+?)(\.md|\.json|\/og\.png)?$/.exec(rest)
	const slug = twin?.[1]
	return slug ? isPublicDocSlug(slug) : true
}

export function isRhinoMarketingPath(pathname: string) {
	if (!rhinoPersonalUse) return false
	const path = normalizePathname(pathname)
	if (marketingExact.has(path)) return true
	if (marketingPrefixes.some((prefix) => hasPathPrefix(path, prefix))) {
		return true
	}
	if (path === '/docs' || path === '/docs.md' || path.startsWith('/docs/')) {
		return isMarketingDocsPath(path)
	}
	if (
		path === '/guides' ||
		path === '/guides.md' ||
		path === '/guides.json' ||
		path.startsWith('/guides/')
	) {
		return isMarketingGuidesPath(path)
	}
	return false
}

/** Footer and header links that still belong on the personal-use site. */
export function rhinoPublicLinkVisible(href: string) {
	if (!rhinoPersonalUse) return true
	if (!href.startsWith('/') || href.startsWith('//')) return true
	return !isRhinoMarketingPath(href)
}

/**
 * Signed-out visitors open login. Signed-in visitors open the personal
 * workspace dashboard (`/@slug/-/overview`).
 */
export function rhinoPersonalHomeHref(input: {
	signedIn: boolean
	personalSlug: string | null
}) {
	if (!input.signedIn) return '/login'
	if (input.personalSlug && isOrganizationSlug(input.personalSlug)) {
		return orgOverviewPath(input.personalSlug)
	}
	return '/account'
}
