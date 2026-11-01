# @kodycodes/cli

Official Kody MCP client. `npm run validate` is the local gate (typecheck,
tests, build).

Skills:

- [rhino-ship-pr](../../.agents/skills/rhino-ship-pr/SKILL.md) — this fork. Wait
  for Cursor Bugbot and file friction on `cameron-nye/rhino`. Do not post to
  Kent's repositories or Discord.
- [ship-pr](./.agents/skills/ship-pr/SKILL.md) — upstream `kody-hq/kody` babysit
  loop. The Rhino guard in that file points at rhino-ship-pr.
- [orchestrate](./.agents/skills/orchestrate/SKILL.md) — fan out sub-agents
  inside one checkout when it clearly pays
