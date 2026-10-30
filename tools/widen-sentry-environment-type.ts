/**
 * Wrangler `--env=production` pins `SENTRY_ENVIRONMENT` to the `"production"`
 * literal. Preview and test runtimes use other values, and worker tests need
 * `Pick<Env, 'SENTRY_ENVIRONMENT'>` to accept those without a hand-rolled type.
 */
export function widenSentryEnvironmentType(source: string) {
	return source.replaceAll(
		'SENTRY_ENVIRONMENT: "production";',
		'SENTRY_ENVIRONMENT: string;',
	)
}

/**
 * Production wrangler pins these hostnames, and `wrangler types` turns each
 * pin into a string literal. Worker tests still pass upstream fixture hosts
 * through `Partial<Env>`. A literal rejects those assignments.
 */
export function widenCommittedHostnameEnvTypes(source: string) {
	return source
		.replace(/USER_EMAIL_DOMAIN: "[^"]+";/g, 'USER_EMAIL_DOMAIN: string;')
		.replace(/SYSTEM_EMAIL_DOMAIN: "[^"]+";/g, 'SYSTEM_EMAIL_DOMAIN: string;')
}
