import { expect, test, waitForClientHydration } from '../playwright-utils.ts'
import {
	authFormHydrationProbeScript,
	injectTrailingAuthFormNode,
	passwordManagerHydrationSelector,
} from '../../packages/worker/start/test-support/auth-form-hydration-html.ts'

test('login hydrates when a password manager injects an extra node into the form', async ({
	page,
}) => {
	const hydrationErrors: string[] = []
	page.on('pageerror', (error) => {
		if (error.message.includes('Hydration mismatch')) {
			hydrationErrors.push(error.message)
		}
	})
	page.on('console', (message) => {
		if (message.type() !== 'error') return
		const text = message.text()
		if (text.includes('Hydration mismatch')) hydrationErrors.push(text)
	})

	await page.route(/\/login(?:\?[^#]*)?$/, async (route) => {
		if (route.request().resourceType() !== 'document') {
			await route.continue()
			return
		}
		const response = await route.fetch()
		const headers = response.headers()
		const contentType = headers['content-type'] ?? ''
		if (!contentType.includes('text/html')) {
			throw new Error(
				`login document content-type was ${contentType || 'missing'}`,
			)
		}
		const nonce =
			headers['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1]
		if (!nonce) {
			throw new Error('login document is missing a script nonce')
		}
		await route.fulfill({
			response,
			body: injectTrailingAuthFormNode(
				await response.text(),
				authFormHydrationProbeScript(nonce),
			),
		})
	})

	await page.goto('/login')
	await waitForClientHydration(page)
	await expect(
		page.locator(
			`form[data-public-auth-form] ${passwordManagerHydrationSelector}`,
		),
	).toHaveCount(1)
	expect(
		await page.evaluate(
			() =>
				(window as unknown as { __pmInjectedBeforeHydrationMark?: boolean })
					.__pmInjectedBeforeHydrationMark === true,
		),
	).toBe(true)
	await expect(
		page.getByRole('button', { name: 'Sign in', exact: true }),
	).toBeEnabled()
	expect(hydrationErrors).toEqual([])
})
