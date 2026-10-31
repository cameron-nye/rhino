import { expect, test, vi } from 'vitest'

import { loadLandingHeroVideos } from './landing-hero-videos.ts'

test('personal-use mode does not fetch the upstream hero playlist', async () => {
	const fetchMock = vi.spyOn(globalThis, 'fetch')
	await expect(loadLandingHeroVideos({ env: {} as Env })).resolves.toEqual([])
	expect(fetchMock).not.toHaveBeenCalled()
	fetchMock.mockRestore()
})
