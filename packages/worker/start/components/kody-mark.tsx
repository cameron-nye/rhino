/** @jsxImportSource @emotion/react */
import { type CSSObject } from '@emotion/react'
import {
	rhinoBodyOnDark,
	rhinoBodyOnLight,
	rhinoBodyPathDs,
	rhinoHorn,
	rhinoHornPathD,
	rhinoMarkAspectRatio,
	rhinoMarkViewBox,
} from '../brand/rhino-mark.ts'

type KodyMarkVariant = 'auto' | 'solid' | 'outlined'

export type KodyMarkProps = {
	/** Rendered height in CSS pixels; width follows the natural aspect ratio. */
	size?: number
	/**
	 * `auto` (default): dark gray body in the light scheme, light gray body in
	 * the dark scheme. `outlined` forces the light-surface body. `solid` forces
	 * the dark-surface body. The horn stays orange in every treatment.
	 */
	variant?: KodyMarkVariant
	/** Accessible name. Empty string keeps the mark decorative when a nearby label exists. */
	title?: string
	className?: string
	css?: CSSObject
}

/**
 * Inline Rhino mark. The component name stays `KodyMark` so upstream
 * callsites do not move. Theme switching uses an SVG `<style>` media query
 * so `prefers-color-scheme` applies inside the SVG.
 */
export function KodyMark({
	size = 34,
	variant = 'auto',
	title = '',
	className,
	css: cssProp,
}: KodyMarkProps) {
	const width = Math.round(size * rhinoMarkAspectRatio)
	const labelled = title.trim().length > 0
	const bodyClass = 'rhino-mark-body'
	const bodyFill =
		variant === 'solid'
			? rhinoBodyOnDark
			: variant === 'outlined'
				? rhinoBodyOnLight
				: undefined

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={rhinoMarkViewBox}
			width={width}
			height={size}
			className={className}
			css={[{ display: 'block', flexShrink: 0 }, cssProp]}
			role={labelled ? 'img' : undefined}
			aria-hidden={labelled ? undefined : true}
			aria-label={labelled ? title : undefined}
			focusable="false"
		>
			{labelled ? <title>{title}</title> : null}
			{variant === 'auto' ? (
				<style>{`.${bodyClass}{fill:${rhinoBodyOnLight}}@media (prefers-color-scheme: dark){.${bodyClass}{fill:${rhinoBodyOnDark}}}`}</style>
			) : null}
			{rhinoBodyPathDs.map((d, index) => (
				<path
					key={index}
					className={variant === 'auto' ? bodyClass : undefined}
					fill={bodyFill}
					d={d}
				/>
			))}
			<path fill={rhinoHorn} d={rhinoHornPathD} />
		</svg>
	)
}
