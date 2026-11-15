/**
 * Brand asset paths and SVG markup. Geometry is the Rhino jet in
 * `rhino-mark.ts`. These names stay so upstream callsites keep compiling.
 */
import {
	rhinoBodyOnDark,
	rhinoBodyOnLight,
	rhinoBodyPathDs,
	rhinoHornPathD,
	rhinoIconSvgMarkup,
	rhinoMarkSvgMarkup,
	rhinoMarkViewBox,
} from './rhino-mark.ts'

/** Rhino jet viewBox; names stay upstream for the loading mark animation. */
export const kodyMarkViewBox = rhinoMarkViewBox

export const kodyMarkPathTransform = ''

/** Loading spinner stroke paths: canopy, port intake, starboard intake, horn. */
export const kodyMarkOutlinedOuterPathD = rhinoBodyPathDs[0]!
export const kodyMarkOutlinedLeftEyePathD = rhinoBodyPathDs[1]!
export const kodyMarkOutlinedRightEyePathD = rhinoBodyPathDs[2]!
export const kodyMarkOutlinedNosePathD = rhinoHornPathD

/** Public asset paths for brand downloads. Filenames stay upstream. */
export const kodyBrandAssets = {
	svgWhite: '/images/brand/kody-mark-white.svg',
	/** Mark for light backgrounds (dark gray body, orange horn). */
	svgOutlined: '/images/brand/kody-mark-outlined.svg',
	pngWhite: '/images/brand/kody-mark-white.png',
	/** Transparent mark for light backgrounds. */
	pngOutlined: '/images/brand/kody-mark-outlined.png',
	/** Light-gray mark on the dark tile. */
	pngSolidDark: '/images/brand/kody-mark-solid-dark.png',
	/** Dark-gray mark on an opaque white square. */
	pngOutlinedSolidLight: '/images/brand/kody-mark-outlined-solid-light.png',
	/** Full logo (mark + RHINO wordmark) for light backgrounds. */
	logoSvgOutlined: '/images/brand/kody-logo-outlined.svg',
	/** Full logo for dark backgrounds. */
	logoSvgWhite: '/images/brand/kody-logo-white.svg',
	logoPngOutlined: '/images/brand/kody-logo-outlined.png',
	logoPngWhite: '/images/brand/kody-logo-white.png',
	guide: '/brand-guide',
} as const

/** Dark-surface mark: light gray body, orange horn. */
export function kodyMarkSvgMarkup(body = rhinoBodyOnDark): string {
	return rhinoMarkSvgMarkup(body)
}

/** Light-surface mark: dark gray body, orange horn. */
export function kodyMarkOutlinedSvgMarkup(body = rhinoBodyOnLight): string {
	return rhinoMarkSvgMarkup(body)
}

/** Browser-tab icon: the jet on the dark rounded tile. */
export function kodyFaviconSvgMarkup(): string {
	return rhinoIconSvgMarkup()
}
