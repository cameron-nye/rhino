/**
 * Personal-use plan seam. Rhino is one person's deployment and does not
 * bill through Stripe, so standing caps must not stop at Free. Upstream
 * plan math stays in `#universal/plans.ts`. Set {@link rhinoPersonalUse}
 * false to resolve the stored plan again.
 */
import { type PlanName } from '#universal/plans.ts'
import { rhinoPersonalUse } from '../../start/brand/rhino-personal.ts'

export function resolveRhinoPersonalUsePlan(plan: PlanName): PlanName {
	return rhinoPersonalUse ? 'max' : plan
}
