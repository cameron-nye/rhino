import { expect, test } from 'vitest'
import {
	widenCommittedHostnameEnvTypes,
	widenSentryEnvironmentType,
} from './widen-sentry-environment-type.ts'

test('widens the production SENTRY_ENVIRONMENT literal so tests can use preview', () => {
	expect(
		widenSentryEnvironmentType(
			'interface Env {\n\tSENTRY_ENVIRONMENT: "production";\n}\n',
		),
	).toBe('interface Env {\n\tSENTRY_ENVIRONMENT: string;\n}\n')
	expect(widenSentryEnvironmentType('SENTRY_ENVIRONMENT: string;')).toBe(
		'SENTRY_ENVIRONMENT: string;',
	)
})

test('widens committed email-domain literals so fixture hosts still typecheck', () => {
	expect(
		widenCommittedHostnameEnvTypes(
			[
				'USER_EMAIL_DOMAIN: "inbox.rhino.nyneelevenlabs.com";',
				'SYSTEM_EMAIL_DOMAIN: "rhino.nyneelevenlabs.com";',
			].join('\n'),
		),
	).toBe(
		['USER_EMAIL_DOMAIN: string;', 'SYSTEM_EMAIL_DOMAIN: string;'].join('\n'),
	)
})
