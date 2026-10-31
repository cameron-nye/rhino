import { applyReferralCookie } from '#app/referral-cookie-middleware.ts'
import { loadResolvedRequestAuth } from '#app/request-auth-cache.ts'
import { isAccountDeletedHome } from '#universal/account-deletion-confirmation.ts'
import {
	loadOrgBindingForPerson,
	PersonalOrgBindingMissingError,
} from '#worker/orgs/repo.ts'
import { rhinoPersonalHomeHref } from '../brand/rhino-personal.ts'

export async function rhinoPersonalHome(
	request: Request,
	env: Env,
	search?: string,
): Promise<{ href: string; setCookie?: string }> {
	const pageSearch = search ?? new URL(request.url).search
	const resolved = await loadResolvedRequestAuth(request, env)
	if (isAccountDeletedHome(pageSearch)) {
		return {
			href: '/login?accountDeleted=1',
			setCookie: resolved.setCookie,
		}
	}
	const user = resolved.user
	if (!user || user.accountSuspended || user.accountDeleting) {
		return {
			href: rhinoPersonalHomeHref({ signedIn: false, personalSlug: null }),
			setCookie: resolved.setCookie,
		}
	}
	try {
		const binding = await loadOrgBindingForPerson(
			env.APP_DB,
			user.mcpUser.userId,
		)
		return {
			href: rhinoPersonalHomeHref({
				signedIn: true,
				personalSlug: binding.org.slug ?? user.username,
			}),
			setCookie: resolved.setCookie,
		}
	} catch (error) {
		if (error instanceof PersonalOrgBindingMissingError) {
			return {
				href: rhinoPersonalHomeHref({ signedIn: false, personalSlug: null }),
				setCookie: resolved.setCookie,
			}
		}
		throw error
	}
}

/** Document redirect for a marketing URL. Does not render the page. */
export async function rhinoMarketingRedirectResponse(
	request: Request,
	env: Env,
): Promise<Response> {
	const home = await rhinoPersonalHome(request, env)
	const headers = new Headers({
		Location: new URL(home.href, request.url).href,
		'Cache-Control': 'private, no-store',
		Vary: 'Cookie',
	})
	if (home.setCookie) headers.append('Set-Cookie', home.setCookie)
	return applyReferralCookie(
		request,
		new Response(null, { status: 302, headers }),
	)
}
