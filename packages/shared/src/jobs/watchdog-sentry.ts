import { type JobRow } from './repo.ts'

/**
 * One overdue/stuck job row formatted for ops logs and Sentry. Values are
 * primitives only so Sentry context does not stringify nested objects as
 * "[Object]" (RHINO-C).
 */
export type WatchdogJobSample = {
	jobId: string
	userId: string
	nextRunAt: string
	lagMs: number
	lastCompletedScheduledFor: string | null
}

export function lagMsForWatchdogJob(
	nextRunAtIso: string,
	observedAtMs: number,
): number {
	const nextRunAtMs = Date.parse(nextRunAtIso)
	if (!Number.isFinite(nextRunAtMs)) return 0
	return Math.max(0, observedAtMs - nextRunAtMs)
}

export function summarizeWatchdogJobsForOps(input: {
	rows: Array<JobRow>
	observedAtMs: number
	maxRows: number
}): Array<WatchdogJobSample> {
	return input.rows.slice(0, input.maxRows).map((row) => ({
		jobId: row.id,
		userId: row.user_id,
		nextRunAt: row.next_run_at,
		lagMs: lagMsForWatchdogJob(row.next_run_at, input.observedAtMs),
		lastCompletedScheduledFor: row.last_completed_scheduled_for,
	}))
}

function formatWatchdogJobSampleLine(sample: WatchdogJobSample): string {
	const completed =
		sample.lastCompletedScheduledFor == null
			? 'lastCompleted=null'
			: `lastCompleted=${sample.lastCompletedScheduledFor}`
	return `jobId=${sample.jobId} userId=${sample.userId} nextRunAt=${sample.nextRunAt} lagMs=${sample.lagMs} ${completed}`
}

/**
 * Context payload for {@link Sentry.captureMessage} on the schedule watchdog.
 * Arrays of plain objects are flattened to strings because the Cloudflare SDK
 * otherwise surfaces samples as "[Object]" in the Sentry UI.
 */
export function buildJobScheduleWatchdogSentryContext(input: {
	counts: Record<string, number | boolean>
	overdueSample: Array<WatchdogJobSample>
	stuckSample: Array<WatchdogJobSample>
}): Record<string, string | number | boolean | null | ReadonlyArray<string>> {
	return {
		...input.counts,
		overdueSampleLines: input.overdueSample.map(formatWatchdogJobSampleLine),
		stuckSampleLines: input.stuckSample.map(formatWatchdogJobSampleLine),
		overdueSampleJson: JSON.stringify(input.overdueSample),
		stuckSampleJson: JSON.stringify(input.stuckSample),
	}
}

/**
 * Returns true when every value in `context` is safe to pass to
 * `Sentry.setContext` (no arrays of non-primitive objects).
 */
export function isSentryContextJsonSafe(
	context: Record<string, unknown>,
): boolean {
	for (const value of Object.values(context)) {
		if (value == null) continue
		if (Array.isArray(value)) {
			for (const entry of value) {
				const kind = typeof entry
				if (kind !== 'string' && kind !== 'number' && kind !== 'boolean') {
					return false
				}
			}
			continue
		}
		const kind = typeof value
		if (kind !== 'string' && kind !== 'number' && kind !== 'boolean') {
			return false
		}
	}
	return true
}
