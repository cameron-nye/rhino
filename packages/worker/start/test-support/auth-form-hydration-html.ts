/** Trailing element a password manager would append inside the auth form. */
export const passwordManagerHydrationNode =
	'<div hidden data-pm-inject=""></div>'

export const passwordManagerHydrationSelector = '[data-pm-inject]'

const formClose = '</form>'

/**
 * Classic script that records the injected node during parse, then removes
 * itself. Deferred Start modules hydrate before DOMContentLoaded, so a
 * listener on that event cannot prove the leftover sibling was present.
 */
export function authFormHydrationProbeScript(nonce: string) {
	if (!/^[0-9a-f]+$/i.test(nonce)) {
		throw new Error('refusing to embed an unexpected document nonce')
	}
	return `<script nonce="${nonce}">window.__pmInjectedBeforeHydrationMark=!!document.querySelector("form[data-public-auth-form] [data-pm-inject]")&&document.documentElement.getAttribute("data-hydrated")!=="true";document.currentScript.remove()</script>`
}

function isInsideScript(html: string, index: number) {
	const before = html.slice(0, index)
	const scriptOpen = before.lastIndexOf('<script')
	if (scriptOpen === -1) return false
	return scriptOpen > before.lastIndexOf('</script>')
}

/**
 * Append a password-manager node as the last child of the public auth form.
 *
 * The Start client hydrates from deferred modules, which run before
 * DOMContentLoaded. The node has to be in the parsed document or reconcile
 * never sees the leftover sibling.
 */
export function injectTrailingAuthFormNode(html: string, afterForm = '') {
	const authFormOpen = /<form\b[^>]*\bdata-public-auth-form\b[^>]*>/gi
	let open: RegExpExecArray | null
	while ((open = authFormOpen.exec(html))) {
		if (isInsideScript(html, open.index)) continue
		const closeAt = html.indexOf('</form>', open.index + open[0].length)
		if (closeAt === -1) {
			throw new Error(
				'public auth form is missing a closing tag for the hydration fixture',
			)
		}
		return (
			html.slice(0, closeAt) +
			passwordManagerHydrationNode +
			formClose +
			afterForm +
			html.slice(closeAt + formClose.length)
		)
	}
	throw new Error(
		'document is missing form[data-public-auth-form] for the hydration fixture',
	)
}
