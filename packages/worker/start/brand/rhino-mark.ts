/**
 * Rhino mark: a head-on F-4 Phantom traced from the official
 * `rhino-mark-on-dark.png` and simplified to one path per part
 * (canopy, intakes, splitter plates, nose) plus a straight horn.
 * Parts do not overlap. Coordinates are the 1024px master.
 *
 * Upstream still imports this through `kody-mark-path.ts` and `KodyMark`
 * so callsites keep their names.
 */
export const rhinoBodyOnDark = '#A7B0B7'
export const rhinoBodyOnLight = '#3A4148'
export const rhinoHorn = '#E5652B'
export const rhinoTile = '#1B1F23'

/** Tight bounds of the jet, in the 1024px master. */
export const rhinoMarkViewBox = '193 97 638 737'

const rhinoMarkViewBoxParts = rhinoMarkViewBox.split(' ').map(Number) as [
	number,
	number,
	number,
	number,
]
export const rhinoMarkAspectRatio =
	rhinoMarkViewBoxParts[2]! / rhinoMarkViewBoxParts[3]!

/** Canopy, side intakes, splitter plates, nose. */
export const rhinoBodyPathDs = [
	'M500 336 L530 337 L561 349 L587 372 L598 388 L608 412 L613 439 L613 487 L600 509 L564 491 L525 483 L500 483 L471 488 L448 496 L425 509 L414 492 L411 486 L412 430 L425 390 L438 371 L456 354 L480 341 L499 337 Z',
	'M287 473 L314 473 L289 814 L238 807 L224 799 L216 789 L201 741 L193 651 L196 562 L202 529 L213 502 L227 487 L238 481 L286 474 Z',
	'M710 473 L762 475 L792 483 L812 503 L826 547 L830 583 L831 648 L827 711 L819 760 L804 795 L795 803 L772 811 L735 814 L710 474 Z',
	'M360 456 L331 834 L298 817 L301 771 L324 470 L359 457 Z',
	'M664 456 L700 470 L709 581 L726 816 L693 834 L663 457 Z',
	'M496 529 L529 529 L550 533 L578 544 L601 559 L625 583 L639 604 L652 635 L657 660 L657 695 L652 720 L638 753 L625 772 L603 795 L582 810 L554 823 L528 829 L498 829 L475 824 L451 814 L421 794 L403 776 L386 752 L374 726 L367 696 L367 659 L373 632 L384 606 L400 582 L421 561 L443 546 L471 534 L495 530 Z',
] as const

export const rhinoHornPathD = 'M499 97 L524 97 L545 324 L479 324 Z'

/**
 * "RHINO" in Saira Stencil One at 28px, cap-height centered in a 34px box
 * (the header mark height). X starts at 0, including the font's left side
 * bearing. Advance width is the font's em-advance for the five letters.
 */
export const rhinoWordmarkAdvance = 87.75
export const rhinoWordmarkPathD =
	'M1.82 7.37L7.42 7.37L7.42 26.63L1.82 26.63ZM9.72 20.08L8.60 20.08L8.60 15.80L9.55 15.80C10.71 15.80 11.23 15.72 11.56 15.46C11.86 15.20 11.96 14.73 11.96 13.72C11.96 12.72 11.86 12.22 11.56 11.96C11.27 11.70 10.78 11.65 9.55 11.65L8.60 11.65L8.60 7.37L11.48 7.37C14.13 7.37 15.71 7.88 16.60 8.96C17.43 9.97 17.64 11.37 17.64 13.72C17.64 15.24 17.50 16.40 17.22 17.22C16.83 18.27 16.14 19.01 15.15 19.44L18.06 26.63L12.18 26.63ZM20.69 7.37L26.29 7.37L26.29 26.63L20.69 26.63ZM31.50 19.21L27.47 19.21L27.47 14.73L31.50 14.73L31.50 7.37L37.10 7.37L37.10 26.63L31.50 26.63ZM40.74 7.37L46.34 7.37L46.34 26.63L40.74 26.63ZM49.98 8.15L49.98 7.37L55.58 7.37L66.39 25.82L66.39 26.63L60.82 26.63ZM61.07 14.40L61.07 7.37L66.39 7.37L66.39 23.50ZM49.98 10.48L55.30 19.58L55.30 26.63L49.98 26.63ZM80.72 17.00C80.72 15.38 80.71 14.31 80.70 13.81C80.62 12.28 80.32 11.66 79.58 11.51C79.20 11.46 78.67 11.43 77.98 11.43C77.18 11.43 76.65 11.47 76.41 11.54L76.41 7.17C76.58 7.15 76.83 7.14 77.17 7.14L77.98 7.14C80.07 7.14 81.69 7.31 82.84 7.63C85.05 8.26 86.00 9.63 86.25 11.96C86.38 13.08 86.44 14.76 86.44 17.00C86.44 18.96 86.39 20.47 86.31 21.52C86.23 22.58 86.02 23.45 85.68 24.14C84.93 25.71 83.49 26.48 80.72 26.74ZM72.10 25.96C70.33 25.10 69.70 23.42 69.58 20.63C69.54 19.78 69.52 18.57 69.52 17.00C69.52 15.04 69.57 13.54 69.65 12.49C69.83 10.31 70.52 8.89 71.99 8.10C72.75 7.69 73.84 7.41 75.24 7.26L75.24 17.00C75.24 18.10 75.25 19.16 75.29 20.16C75.37 21.69 75.64 22.35 76.38 22.46C76.70 22.53 77.23 22.57 77.98 22.57C78.75 22.57 79.27 22.54 79.55 22.49L79.55 26.83C79.38 26.85 79.13 26.86 78.79 26.86L77.98 26.86C75.25 26.86 73.29 26.56 72.10 25.96Z'

/** Self-hosted display face. Only brand lockups should use it. */
export const rhinoWordmarkFontFamily = "'Saira Stencil One', sans-serif"

function rhinoMarkShapesMarkup(body: string): string {
	const parts = rhinoBodyPathDs.map((d) => `  <path fill="${body}" d="${d}"/>`)
	parts.push(`  <path fill="${rhinoHorn}" d="${rhinoHornPathD}"/>`)
	return parts.join('\n')
}

export function rhinoMarkSvgMarkup(body: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${rhinoMarkViewBox}" role="img" aria-label="Rhino">
${rhinoMarkShapesMarkup(body)}
</svg>
`
}

/** App icon: the jet on the dark rounded tile. */
export function rhinoIconSvgMarkup(): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Rhino">
  <rect width="1024" height="1024" rx="220" fill="${rhinoTile}"/>
${rhinoMarkShapesMarkup(rhinoBodyOnDark)}
</svg>
`
}
