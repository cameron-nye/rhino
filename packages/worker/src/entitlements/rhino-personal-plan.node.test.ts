import { expect, test, vi } from 'vitest'
import { resolveEntitlementLimit } from '#universal/plans.ts'
import { resolveRhinoPersonalUsePlan } from './rhino-personal-plan.ts'
import {
	resolveBaseUserEntitlement,
	resolveUserEntitlementFromRow,
	resolveUserPlanFromRow,
	type UserEntitlementRow,
} from './service.ts'

const personal = vi.hoisted(() => ({ rhinoPersonalUse: true }))

vi.mock('../../start/brand/rhino-personal.ts', () => ({
	get rhinoPersonalUse() {
		return personal.rhinoPersonalUse
	},
}))

// The suite stub keeps every other file on upstream plans. This file runs
// the real seam, with the personal-use switch toggled per test.
vi.mock('./rhino-personal-plan.ts', () =>
	vi.importActual('./rhino-personal-plan.ts'),
)

const freeRow = {
	plan: 'free',
	stripe_plan: null,
	entitlement_ladder: 'public',
	stripe_credits_eligible: 0,
	admin_credits_eligible: 0,
	second_agent_standard_gift_expires_at: null,
	referral_standard_credit_expires_at: null,
} as const satisfies UserEntitlementRow

const orgId = 'a'.repeat(64)

function emptyLimitDb(): D1Database {
	const statement = {
		bind() {
			return statement
		},
		async first() {
			return null
		},
		async all() {
			return { results: [] }
		},
	}
	return { prepare: () => statement } as unknown as D1Database
}

test('personal-use on resolves every account to max and 5000 scheduled jobs', async () => {
	personal.rhinoPersonalUse = true
	expect(resolveRhinoPersonalUsePlan('free')).toBe('max')
	expect(resolveUserPlanFromRow(freeRow).plan).toBe('max')

	const db = emptyLimitDb()
	const entitlement = await resolveUserEntitlementFromRow({
		db,
		stableUserId: orgId,
		row: freeRow,
	})
	const base = await resolveBaseUserEntitlement({
		db,
		stableUserId: orgId,
		row: freeRow,
	})
	expect(entitlement.plan).toBe('max')
	expect(base.plan).toBe('max')
	expect(resolveEntitlementLimit(entitlement, 'scheduled_jobs')).toBe(5_000)
	expect(resolveEntitlementLimit(base, 'scheduled_jobs')).toBe(5_000)
	expect(
		resolveUserPlanFromRow({
			...freeRow,
			stripe_plan: 'pro',
			stripe_credits_eligible: 1,
		}).plan,
	).toBe('max')
})

test('personal-use off keeps upstream plans and the free scheduled-job cap', async () => {
	personal.rhinoPersonalUse = false
	expect(resolveRhinoPersonalUsePlan('free')).toBe('free')
	expect(resolveRhinoPersonalUsePlan('pro')).toBe('pro')
	expect(resolveUserPlanFromRow(freeRow)).toEqual({
		plan: 'free',
		ladder: 'public',
		creditsEligible: false,
	})

	const db = emptyLimitDb()
	const entitlement = await resolveUserEntitlementFromRow({
		db,
		stableUserId: orgId,
		row: freeRow,
	})
	const base = await resolveBaseUserEntitlement({
		db,
		stableUserId: orgId,
		row: freeRow,
	})
	expect(entitlement.plan).toBe('free')
	expect(base.plan).toBe('free')
	expect(resolveEntitlementLimit(entitlement, 'scheduled_jobs')).toBe(5)
	expect(resolveEntitlementLimit(base, 'scheduled_jobs')).toBe(5)
	expect(
		resolveUserPlanFromRow({
			...freeRow,
			stripe_plan: 'pro',
			stripe_credits_eligible: 1,
		}),
	).toEqual({
		plan: 'pro',
		ladder: 'public',
		creditsEligible: true,
	})

	const now = new Date('2026-07-25T12:00:00.000Z')
	expect(
		resolveUserPlanFromRow(
			{
				...freeRow,
				second_agent_standard_gift_expires_at: '2026-08-25T00:00:00.000Z',
			},
			now,
		).plan,
	).toBe('pro')
})
