/**
 * Homepage copy (hero plus the early-scroll sections). Wording stays the
 * upstream homepage except the product name, which is Rhino on this fork.
 * Do not invent positioning or swap in synonyms.
 */

export const landingHeroHeadlineLead = 'The '
export const landingHeroHeadlineEmphasis = 'shared cloud'
export const landingHeroHeadlineTail = ' for your team\u2019s agents'

export const landingHeroSubhead =
	'One place for the credentials, tools, and workflows for every agent your team members use.'
export const landingHeroPrimaryCta = 'Connect your agent'
export const landingHeroPlugLine =
	'Keep your agent. Rhino is what it plugs into.'

export const landingPrimitivesIntroLead =
	'Rhino gives your agents a shared set of primitives.'
export const landingPrimitivesMoreLead = 'Want the full picture?'
export const landingPrimitivesMoreLink = 'What is Rhino?'

export const landingHomePrimitives = [
	{
		id: 'memory',
		word: 'memory',
		body: 'Facts without a better home, like project nicknames or team context, that your connected agents can retrieve.',
	},
	{
		id: 'packages',
		word: 'packages',
		body: 'Reusable code with typed inputs and documented defaults. Keep how a task gets done in the package, ready for any connected agent to run.',
	},
	{
		id: 'triggers',
		word: 'triggers',
		body: 'Subscriptions, emails, webhooks, and schedules that wake packages you own, with no chat left open.',
	},
	{
		id: 'integrations',
		word: 'credentials',
		body: 'API keys, OAuth connections, and MCP servers your agents use but never see.',
	},
	{
		id: 'apps',
		word: 'apps',
		body: 'A hosted page a package serves, so the work is something you open instead of another turn in chat.',
	},
] as const

export type LandingHomePrimitive = (typeof landingHomePrimitives)[number]

export const landingIsHeadingLead = 'What Rhino '
export const landingIsHeadingIs = 'is'
export const landingIsHeadingJoin = ' and '
export const landingIsHeadingIsNot = 'is not'

export const landingIsNotItems = [
	{
		kicker: 'Not an agent.',
		body: 'Rhino does not reason, chat, or decide. Your agent does the thinking. Rhino keeps what it needs between conversations.',
	},
	{
		kicker: 'Not a chat app.',
		body: 'There is no Rhino chat window to learn. Your team keeps working in the agents they already use.',
	},
	{
		kicker: 'Not tied to one agent.',
		body: 'Cursor, Claude, ChatGPT, Codex, or any agent that speaks MCP. They all reach the same account.',
	},
] as const

export const landingIsItem = {
	kicker: 'Rhino is the shared layer behind them.',
	body: 'The shared credentials, tools, and workflows behind every agent your team uses.',
} as const

export const landingCompareWithoutTitle = 'Without Rhino'
export const landingCompareWithTitle = 'With Rhino'
export const landingCompareCaption = 'Ask once. Save it. Trigger it.'

export const landingCompareWithoutItems = [
	'Re-teach the agent each session',
	'Re-wire secrets per host',
	'Rebuild the same automation when you change agents',
] as const

export const landingCompareWithItems = [
	'Memory and packages live in one home',
	'Secrets stay usable without landing in the prompt',
	'Trigger the same package from cron, webhook, email, or any connected agent',
] as const

export const landingClosingHeadingLead = 'Invisible '
export const landingClosingHeadingEmphasis = 'software'
export const landingClosingLead =
	'People want problems solved, not another app. Rhino stays out of sight, behind the agents your team already uses.'
export const landingClosingBelieveLink = 'What we believe'
