import { expect, test } from 'vitest'
import {
	getKodyLogoDataUri,
	getKodyMarkDataUri,
} from './og-image-assets.node.ts'
import { type OgTheme } from './palette.ts'

function decodeMark(theme: OgTheme): string {
	const dataUri = getKodyMarkDataUri(theme)
	const prefix = 'data:image/svg+xml;base64,'
	expect(dataUri.startsWith(prefix)).toBe(true)
	return Buffer.from(dataUri.slice(prefix.length), 'base64').toString('utf8')
}

test('the OG header mark keeps the jet body and orange horn', () => {
	const dark = decodeMark('dark')
	const light = decodeMark('light')
	expect(dark).toContain('#A7B0B7')
	expect(dark).toContain('#E5652B')
	expect(light).toContain('#3A4148')
	expect(light).toContain('#E5652B')
	expect(dark).not.toBe(light)
})

test('the OG header lockup keeps the jet body, orange horn, and RHINO wordmark', () => {
	const dark = decodeLogo('dark')
	const light = decodeLogo('light')
	expect(dark).toContain('#A7B0B7')
	expect(dark).toContain('#E5652B')
	expect(dark).toContain('viewBox="0 0 127.95 34"')
	expect(light).toContain('#3A4148')
	expect(light).toContain('#E5652B')
	expect(light).toContain('viewBox="0 0 127.95 34"')
	expect(dark).not.toBe(light)
})

function decodeLogo(theme: OgTheme): string {
	const dataUri = getKodyLogoDataUri(theme)
	const prefix = 'data:image/svg+xml;base64,'
	expect(dataUri.startsWith(prefix)).toBe(true)
	return Buffer.from(dataUri.slice(prefix.length), 'base64').toString('utf8')
}
