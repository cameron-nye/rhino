import { expect, test, waitForClientHydration } from '../playwright-utils.ts'

test('login hydrates when a password manager injects an extra node into the form', async ({
	page,
}) => {
	const hydrationErrors: string[] = []
	page.on('pageerror', (error) => {
		if (error.message.includes('Hydration mismatch')) {
			hydrationErrors.push(error.message)
		}
	})

	await page.addInitScript(() => {
		const poll = () => {
			const form = document.querySelector<HTMLFormElement>(
				'form[data-public-auth-form]',
			)
			if (!form) {
				requestAnimationFrame(poll)
				return
			}
			if (form.querySelector('[data-pm-inject]')) return
			const injected = document.createElement('div')
			injected.hidden = true
			injected.dataset.pmInject = ''
			form.appendChild(injected)
		}
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', poll, { once: true })
		} else {
			poll()
		}
	})

	await page.goto('/login')
	await waitForClientHydration(page)
	await expect(
		page.getByRole('button', { name: 'Sign in', exact: true }),
	).toBeEnabled()
	expect(hydrationErrors).toEqual([])
})
