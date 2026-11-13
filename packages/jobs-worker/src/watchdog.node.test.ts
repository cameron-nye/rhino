import { expect, test } from 'vitest'
import {
	jobScheduleWatchdogGraceMs,
	jobScheduleWatchdogQueueLagCoalesceMs,
	resolveJobScheduleWatchdogGraceMs,
} from './watchdog.ts'

test('resolveJobScheduleWatchdogGraceMs extends grace when the queue delivers soon after a watchdog cron tick', () => {
	const scheduledAt = new Date('2026-11-12T22:15:00.000Z')
	const observedAt = new Date('2026-11-12T22:16:09.000Z')
	expect(resolveJobScheduleWatchdogGraceMs({ observedAt, scheduledAt })).toBe(
		jobScheduleWatchdogGraceMs + jobScheduleWatchdogQueueLagCoalesceMs,
	)
	expect(
		resolveJobScheduleWatchdogGraceMs({
			observedAt,
			scheduledAt: new Date('2026-11-12T22:16:00.000Z'),
		}),
	).toBe(jobScheduleWatchdogGraceMs)
})

test('queue-lag coalesce suppresses borderline five-minute-late rows seen in RHINO-C', () => {
	const observedAt = new Date('2026-11-12T22:16:09.000Z')
	const scheduledAt = new Date('2026-11-12T22:15:00.000Z')
	const graceMs = resolveJobScheduleWatchdogGraceMs({ observedAt, scheduledAt })
	const overdueBeforeMs = observedAt.getTime() - graceMs
	const sixMinutesLate = Date.parse('2026-11-12T22:10:09.000Z')
	const fiveMinutes59Late = Date.parse('2026-11-12T22:10:10.000Z')
	const fifteenMinutesLate = Date.parse('2026-11-12T22:00:00.000Z')
	expect(sixMinutesLate <= overdueBeforeMs).toBe(false)
	expect(fiveMinutes59Late <= overdueBeforeMs).toBe(false)
	expect(fifteenMinutesLate <= overdueBeforeMs).toBe(true)
})
