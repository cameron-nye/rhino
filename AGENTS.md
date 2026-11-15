# rhino agent index

Rhino ([fork rules](./docs/contributing/rhino.md)) is Your agents' cloud for
individuals and teams: each account holds isolated packages, jobs, credentials,
memories, remote connectors, email, and storage.

Reuse existing UI components and styles. Extend shared controls for shared
behavior. Never add unstyled native selects. `npm run validate` is the local
gate; verify UI/API with [control-kody](./docs/contributing/control-kody.md).

Open the page that owns the task:

- Docs map: [contributing](./docs/contributing/index.md) ·
  [principles](./docs/principles/index.md) · [skills](./.agents/skills/) ·
  [blog](./docs/contributing/blog.md)
- Invite a whole team: [organizations](./docs/guides/organizations.md)
  (`guide:organizations`, `inviteLinkCreate`)
- Cloud Agent VM gotchas (Node, Playwright, dev server, seeding, limits):
  [docs/contributing/cloud-agents.md](./docs/contributing/cloud-agents.md)
- Dependency bump or audit fix: reuse an open PR, never open a duplicate
  ([rule](./docs/contributing/dependency-overrides.md#dependency-bump-prs))
- Never run `wrangler deploy`, `versions upload|deploy`, or `secret put|bulk`
  against `kody-production` or any production Worker; only the Deploy workflow
  deploys ([rule](./docs/contributing/rollback.md#ci-only-production-deploys))
