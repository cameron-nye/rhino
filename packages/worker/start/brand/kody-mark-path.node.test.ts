import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import {
	kodyFaviconSvgMarkup,
	kodyMarkOutlinedSvgMarkup,
	kodyMarkSvgMarkup,
} from './kody-mark-path.ts'
import {
	rhinoBodyOnDark,
	rhinoBodyOnLight,
	rhinoHorn,
	rhinoTile,
} from './rhino-mark.ts'

const brandDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../public/images/brand',
)

test('published mark SVGs match the markup helper', () => {
	const published = readFileSync(
		path.join(brandDir, 'kody-mark-outlined.svg'),
		'utf8',
	)
	expect(published).toBe(kodyMarkOutlinedSvgMarkup())
	const publishedSolid = readFileSync(
		path.join(brandDir, 'kody-mark-white.svg'),
		'utf8',
	)
	expect(publishedSolid).toBe(kodyMarkSvgMarkup())
})

test('the mark is separate filled parts with an orange horn', () => {
	const outlined = kodyMarkOutlinedSvgMarkup()
	expect(outlined).toContain(`fill="${rhinoBodyOnLight}"`)
	expect(outlined).toContain(`fill="${rhinoHorn}"`)
	expect(outlined).not.toContain('clipPath')
	expect(outlined).not.toContain('stroke=')
	const solid = kodyMarkSvgMarkup()
	expect(solid).toContain(`fill="${rhinoBodyOnDark}"`)
	expect(solid).toContain(`fill="${rhinoHorn}"`)
	expect(solid).not.toBe(outlined)
})

test('tab favicon markup is the jet on the dark rounded tile', () => {
	const favicon = kodyFaviconSvgMarkup()
	expect(favicon).toContain(`fill="${rhinoTile}"`)
	expect(favicon).toContain(`fill="${rhinoBodyOnDark}"`)
	expect(favicon).toContain(`fill="${rhinoHorn}"`)
	expect(favicon).toContain('<rect')
	expect(favicon).not.toContain('prefers-color-scheme')
})
