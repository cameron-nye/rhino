import { vi } from 'vitest'

/**
 * Personal-use mode resolves every stored plan to Max. Limit tests in this
 * suite still describe upstream plans. `rhino-personal-plan.node.test.ts`
 * loads the real seam with `vi.importActual`.
 */
vi.mock('../entitlements/rhino-personal-plan.ts', () => ({
	resolveRhinoPersonalUsePlan(plan: string) {
		return plan
	},
}))
