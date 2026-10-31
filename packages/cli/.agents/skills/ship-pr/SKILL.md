---
name: ship-pr
description: >
  Babysit a pull request to done. On cameron-nye/rhino, follow the root
  rhino-ship-pr skill: wait for Cursor Bugbot, file friction on this fork, and
  do not call @kentcdodds/ship-pr or Discord. Upstream kody-hq/kody still ticks
  the ship-pr package. Use when a pull request needs to be shepherded to done.
---

# Ship a pull request

## Rhino fork

This checkout is Cameron's fork. Follow
[rhino-ship-pr](../../../../../.agents/skills/rhino-ship-pr/SKILL.md). Stop
here. Do not run the tick command below. Do not call `@kentcdodds/ship-pr` or
post to Discord. Do not open issues on Kent's repositories.

## Upstream (kody-hq/kody only)

```bash
npx @kodycodes/cli execute --local \
  --code 'import run from "kody:@kentcdodds/ship-pr/tick"; export default (p) => run(p)' \
  --params '{
    "prUrl": "https://github.com/OWNER/REPO/pull/N",
    "risk": "medium",
    "applySafeAutomations": true
  }'
```

Follow what it returns, re-ticking until `exit.done`.

- **Risk:** pick `low`, `medium`, or `high` yourself. High means auth, secrets,
  billing, data migrations, destructive changes, or anything hard to undo.
- **Merge:** auto-merge low and medium once CI is green and valid reviewer
  feedback is handled. High waits for Kent unless he explicitly said to merge.
