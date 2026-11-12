import { ownerIdFromStored } from '../owner-person-ids.ts'
import { expect, test } from 'vitest'
import {
	buildJobScheduleWatchdogSentryContext,
	isSentryContextJsonSafe,
	lagMsForWatchdogJob,
	summarizeWatchdogJobsForOps,
	type WatchdogJobSample,
} from './watchdog-sentry.ts'
import { type JobRow } from './repo.ts'

function fixtureJobRow(overrides: Partial<JobRow> = {}): JobRow {
	return {
		id: 'job-1',
		user_id: ownerIdFromStored('user-1'),
		created_by_user_id: null,
		deleted_at: null,
		deleting_at: null,
		name: 'package followup',
		source_id: 'src',
		published_commit: null,
		repo_check_policy_json: null,
		storage_id: 'stor',
		params_json: null,
		schedule_json: '{}',
		timezone: 'UTC',
		enabled: 1,
		kill_switch_enabled: 0,
		expires_at: null,
		disabled_reason: null,
		caller_context_json: '{}',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		last_run_at: null,
		last_run_status: null,
		next_run_at: '2026-11-12T22:00:00.000Z',
		claim_token: null,
		running_since: null,
		lease_expires_at: null,
		claimed_scheduled_for: null,
		retry_scheduled_for: null,
		retry_count: 0,
		last_completed_scheduled_for: null,
		record: {} as JobRow['record'],
		callerContextJson: '{}',
		callerContext: null,
		schedulerWakeAt: '2026-11-12T22:00:00.000Z',
		...overrides,
	}
}

test('lagMsForWatchdogJob never returns negative lag', () => {
	expect(
		lagMsForWatchdogJob(
			'2026-11-12T22:15:00.000Z',
			Date.parse('2026-11-12T22:14:00.000Z'),
		),
	).toBe(0)
	expect(
		lagMsForWatchdogJob(
			'2026-11-12T22:00:00.000Z',
			Date.parse('2026-11-12T22:16:09.000Z'),
		),
	).toBe((16 * 60 + 9) * 1_000)
})

test('summarizeWatchdogJobsForOps omits user-authored job names', () => {
	const rows = [
		fixtureJobRow({
			id: 'job-a',
			name: 'secret customer workflow',
		}),
	]
	const observedAtMs = Date.parse('2026-11-12T22:16:09.000Z')
	const samples = summarizeWatchdogJobsForOps({
		rows,
		observedAtMs,
		maxRows: 20,
	})
	expect(samples).toEqual([
		expect.objectContaining({
			jobId: 'job-a',
			userId: 'user-1',
			nextRunAt: '2026-11-12T22:00:00.000Z',
			lagMs: observedAtMs - Date.parse('2026-11-12T22:00:00.000Z'),
		}),
	])
	expect(JSON.stringify(samples)).not.toContain('secret customer workflow')
})

test('buildJobScheduleWatchdogSentryContext flattens samples for Sentry', () => {
	const sample: WatchdogJobSample = {
		jobId: 'job-1',
		userId: 'user-1',
		nextRunAt: '2026-11-12T22:00:00.000Z',
		lagMs: 969_000,
		lastCompletedScheduledFor: null,
	}
	const context = buildJobScheduleWatchdogSentryContext({
		counts: { overdueJobCount: 1, usersSynced: 1 },
		overdueSample: [sample],
		stuckSample: [],
	})
	expect(isSentryContextJsonSafe(context)).toBe(true)
	expect(context.overdueSampleLines).toEqual([
		'jobId=job-1 userId=user-1 nextRunAt=2026-11-12T22:00:00.000Z lagMs=969000 lastCompleted=null',
	])
	expect(JSON.parse(String(context.overdueSampleJson))).toEqual([sample])
	expect(JSON.stringify(context)).not.toContain('[Object]')
})

test('isSentryContextJsonSafe rejects arrays of objects (RHINO-C shape)', () => {
	expect(
		isSentryContextJsonSafe({
			overdueSample: [{ jobId: 'x' }],
		}),
	).toBe(false)
})
