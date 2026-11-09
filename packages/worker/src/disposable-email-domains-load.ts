/**
 * Load the disposable-email domain blocklist from the deferred additional
 * module. Specifier must stay `./node_modules/.kody-generated/…` relative to
 * `packages/worker/src` so Wrangler matches the ESModule rule (same lane as
 * `postal-mime-load.ts`).
 *
 * Type the payload with `typeof import(...)` queries only — a top-level
 * `import type` from `disposable-email-domains.ts` keeps the list in Wrangler
 * main.
 */

export type DisposableEmailDomainList = ReadonlyArray<string>

let memo: Promise<DisposableEmailDomainList> | null = null

/**
 * Signup and email-change already await `assessAccountEmail`; the list loads
 * on first disposable check and is cached for the isolate.
 */
export function loadDisposableEmailDomains(): Promise<DisposableEmailDomainList> {
	memo ??=
		import('./node_modules/.kody-generated/disposable-email-domains.mjs').then(
			(module) => module.disposableEmailDomainList,
			(error: unknown) => {
				memo = null
				throw error
			},
		)
	return memo
}
