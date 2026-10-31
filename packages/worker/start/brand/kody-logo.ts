import {
	rhinoBodyOnDark,
	rhinoBodyOnLight,
	rhinoBodyPathDs,
	rhinoHorn,
	rhinoHornPathD,
	rhinoMarkViewBox,
	rhinoWordmarkAdvance,
	rhinoWordmarkPathD,
} from './rhino-mark.ts'

/**
 * Full logo: the jet plus the RHINO wordmark, laid out like the site header
 * (mark beside 28px Saira Stencil One, 0.7rem gap, vertically centered).
 * The wordmark is outlined so email and downloads do not need the font.
 */
const kodyLogoHeight = 34
const kodyLogoGap = 11.2
const [markX, markY, markWidth, markHeight] = rhinoMarkViewBox
	.split(' ')
	.map(Number) as [number, number, number, number]
const headerMarkWidth = Math.round(kodyLogoHeight * (markWidth / markHeight))
const markScale = Math.min(
	headerMarkWidth / markWidth,
	kodyLogoHeight / markHeight,
)
const markOffsetY = (kodyLogoHeight - markHeight * markScale) / 2
const kodyLogoMarkTransform = `translate(0 ${round(markOffsetY, 4)}) scale(${round(markScale, 8)}) translate(${-markX} ${-markY})`
const wordmarkX = round(headerMarkWidth + kodyLogoGap, 4)
const kodyLogoWidth = round(wordmarkX + rhinoWordmarkAdvance, 2)
export const kodyLogoViewBox = `0 0 ${kodyLogoWidth} ${kodyLogoHeight}`

/** Natural width÷height of the logo viewBox. */
export const kodyLogoAspectRatio = kodyLogoWidth / kodyLogoHeight

/** RHINO outlined in Saira Stencil One, in logo viewBox units. */
export const kodyWordmarkPathD = rhinoWordmarkPathD

function round(value: number, digits: number) {
	const factor = 10 ** digits
	return Math.round(value * factor) / factor
}

function logoShapes(body: string): string {
	const parts = rhinoBodyPathDs.map(
		(d) => `    <path fill="${body}" d="${d}"/>`,
	)
	parts.push(`    <path fill="${rhinoHorn}" d="${rhinoHornPathD}"/>`)
	return parts.join('\n')
}

function logoSvg(body: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${kodyLogoViewBox}" role="img" aria-label="Rhino">
  <g transform="${kodyLogoMarkTransform}">
${logoShapes(body)}
  </g>
  <g transform="translate(${wordmarkX} 0)">
    <path fill="${body}" d="${rhinoWordmarkPathD}"/>
  </g>
</svg>
`
}

/** Dark-surface logo: light gray jet and wordmark, orange horn. */
export function kodyLogoSvgMarkup(body = rhinoBodyOnDark): string {
	return logoSvg(body)
}

/** Light-surface logo: dark gray jet and wordmark, orange horn. */
export function kodyLogoOutlinedSvgMarkup(body = rhinoBodyOnLight): string {
	return logoSvg(body)
}
