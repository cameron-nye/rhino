import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { expect, test } from 'vitest'
import { kodyFaviconSvgMarkup } from './kody-mark-path.ts'
import { rhinoHorn, rhinoTile } from './rhino-mark.ts'

const publicDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../public',
)

async function readPixels(file: string) {
	const bytes = readFileSync(path.join(publicDir, file))
	const { data, info } = await sharp(bytes)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })
	expect(info.width).toBe(info.height)
	return {
		size: info.width,
		pixel: (x: number, y: number) => {
			const offset = (y * info.width + x) * 4
			return [...data.subarray(offset, offset + 4)] as [
				number,
				number,
				number,
				number,
			]
		},
	}
}

test('published favicon.svg matches the tiled app icon', () => {
	const published = readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8')
	expect(published).toBe(kodyFaviconSvgMarkup())
	expect(published).toContain(`fill="${rhinoTile}"`)
	expect(published).toContain(`fill="${rhinoHorn}"`)
	expect(published).toContain('<rect')
	const viewBox = published
		.match(/viewBox="([^"]+)"/)?.[1]
		?.split(' ')
		.map(Number)
	expect(viewBox?.[2]).toBeCloseTo(viewBox?.[3] ?? 0, 5)
})

function isOrange([red, green, blue, alpha]: [number, number, number, number]) {
	// 16px antialiasing dulls the horn, so this is wider than the master orange.
	return alpha > 80 && red > 90 && red > green + 25 && blue < 100
}

test('tab favicons are the rounded dark tile with an orange horn', async () => {
	for (const file of [
		'favicon-16x16.png',
		'favicon-32x32.png',
		'favicon-16x16-dark.png',
		'favicon-32x32-dark.png',
	]) {
		const { size, pixel } = await readPixels(file)
		const last = size - 1
		for (const [x, y] of [
			[0, 0],
			[last, 0],
			[0, last],
			[last, last],
		] as const) {
			expect({ file, x, y, alpha: pixel(x, y)[3] }).toEqual({
				file,
				x,
				y,
				alpha: 0,
			})
		}
		const mid = Math.floor(size / 2)
		const edge = pixel(0, mid)
		expect(edge[3]).toBeGreaterThan(200)
		expect(edge[0]).toBeLessThan(80)
		let orange = 0
		for (let y = 0; y < size; y += 1) {
			for (let x = 0; x < size; x += 1) {
				if (isOrange(pixel(x, y))) orange += 1
			}
		}
		expect(orange).toBeGreaterThan(0)
	}
})

test('favicon.ico embeds PNG frames at 16, 32, and 48', () => {
	const ico = readFileSync(path.join(publicDir, 'favicon.ico'))
	expect(ico.readUInt16LE(0)).toBe(0)
	expect(ico.readUInt16LE(2)).toBe(1)
	const count = ico.readUInt16LE(4)
	expect(count).toBe(3)
	const sizes = new Set<number>()
	for (let i = 0; i < count; i += 1) {
		const dir = 6 + i * 16
		const width = ico[dir] === 0 ? 256 : ico[dir]!
		sizes.add(width)
		const byteSize = ico.readUInt32LE(dir + 8)
		const offset = ico.readUInt32LE(dir + 12)
		expect([...ico.subarray(offset, offset + 8)]).toEqual([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		])
		expect(byteSize).toBeGreaterThan(100)
	}
	expect([...sizes].sort((a, b) => a - b)).toEqual([16, 32, 48])
})
