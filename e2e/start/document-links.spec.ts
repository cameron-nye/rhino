import { expect, test } from '../playwright-utils.ts'

// Personal-use mode redirects public docs and the blog before Start renders
// them, so the upstream first-click checks for those documents do not run
// here. Admin docs stay behind auth. See docs/contributing/rhino.md.
test('signed-out docs and blog requests land on login', async ({ page }) => {
	for (const path of [
		'/docs',
		'/docs/local-execute',
		'/docs/local-execute.md',
		'/blog',
		'/blog/rss.xml',
	]) {
		await page.goto(path)
		await expect(page).toHaveURL(/\/login$/)
	}
	await expect(
		page.getByRole('heading', { name: 'Welcome back' }),
	).toBeVisible()
})
