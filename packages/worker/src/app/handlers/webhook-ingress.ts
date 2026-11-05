import { handleWebhookIngressRequest } from '#worker/webhooks/http.ts'

/**
 * App-router registration for inbound webhook ingress. The Worker fetch
 * handler also intercepts this path early for subscription challenges and
 * ack-mode enqueue (before Remix routing). The queue send is durable via
 * `kody-webhook-dispatch`. The acceptance record and rotate-overlap retire
 * run on `ctx.waitUntil` when the fetch handler supplies a context, and are
 * awaited when it does not (this Start route).
 */
export function createWebhookIngressHandler(env: Env) {
	return async ({ request }: { request: Request }) => {
		return handleWebhookIngressRequest(request, env)
	}
}
