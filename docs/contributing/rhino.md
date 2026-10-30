# Rhino fork

This repository is Cameron Nye's private fork of
[kody-hq/kody](https://github.com/kody-hq/kody) (Kent C. Dodds' Kody). The
product name people see is **Rhino** (NyneEleven Labs). Upstream internals stay
named Kody.

## Minimal divergence

Rhino stays as close to upstream `kody-hq/kody` as possible so biweekly upstream
syncs merge cleanly. Prefer config, environment variables, and additive files
over editing upstream code. When an upstream file must change, keep the edit
small and add a row to the divergence list in the same change.

Leave these names alone: package names, worker names, Wrangler resource names
(including `kody-production` and `kody-capabilities-prod`), environment variable
names, the `kody:` protocol and URIs, MCP tool names, database names, and file
or directory names.

## Divergence list

Intentional differences from upstream. Each row is a file this fork edits on
purpose.

| File                                                                      | Why                                                                                                                   |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `docs/contributing/rhino.md`                                              | Additive fork rules (this page).                                                                                      |
| `.github/workflows/rhino-automerge.yml`                                   | Squash-merge green same-repo `cursor/` pull requests and dispatch production deploy.                                  |
| `AGENTS.md`                                                               | Opening pointer to this page. Stays inside the 23-line `agents-md` budget.                                            |
| `docs/contributing/index.md`                                              | Link to this page from the contributing map.                                                                          |
| `README.md`                                                               | Headline, logo alt text, and the opening product paragraphs. License text stays upstream.                             |
| `packages/worker/start/components/site-header.tsx`                        | Header wordmark.                                                                                                      |
| `packages/worker/start/components/site-footer.tsx`                        | Footer wordmark.                                                                                                      |
| `packages/worker/start/components/workspace-layout.tsx`                   | Sidebar wordmark and home label.                                                                                      |
| `packages/worker/start/pages/login-sections.tsx`                          | Sign-in brand label.                                                                                                  |
| `packages/worker/start/pages/login.tsx`                                   | "Back to Rhino" link.                                                                                                 |
| `packages/worker/start/pages/signup-choose-username.tsx`                  | "Back to Rhino" link.                                                                                                 |
| `packages/worker/start/components/brand-context-menu.tsx`                 | Brand menu accessible name.                                                                                           |
| `packages/worker/universal/document-head.ts`                              | Default title and page-title / share-title product suffix.                                                            |
| `packages/worker/universal/og-pages.ts`                                   | Share-card titles and image titles that name the product. Descriptions stay upstream.                                 |
| `packages/worker/start/routes/__root.tsx`                                 | Root document title uses `DEFAULT_DOCUMENT_TITLE`.                                                                    |
| `packages/worker/start/routes/unsubscribe.tips.tsx`                       | Fallback document title.                                                                                              |
| `packages/worker/start/routes/verify-email.tsx`                           | Fallback document title.                                                                                              |
| `packages/worker/start/routes/verify-email-change.tsx`                    | Fallback document title.                                                                                              |
| `packages/worker/start/routes/verify-email-claim-release.tsx`             | Fallback document title.                                                                                              |
| `packages/worker/start/routes/verify-email-destination.tsx`               | Fallback document title.                                                                                              |
| `packages/worker/universal/landing-home-copy.ts`                          | Homepage product-name sentences. Other wording stays the upstream homepage.                                           |
| `packages/worker/start/components/landing-agent-marquee.tsx`              | Homepage accessible name.                                                                                             |
| `packages/worker/start/components/landing-hero-agents.tsx`                | Homepage accessible name.                                                                                             |
| `packages/worker/start/components/landing-lantern.tsx`                    | Homepage caption.                                                                                                     |
| `packages/worker/start/components/landing-loop-player.tsx`                | Homepage section title.                                                                                               |
| `packages/worker/start/pages/onboarding.tsx`                              | Onboarding heading.                                                                                                   |
| `packages/worker/start/pages/onboarding-banner.tsx`                       | Onboarding banner accessible name.                                                                                    |
| `packages/worker/start/pages/about.tsx`                                   | About heading and the product-definition paragraphs. Host facts stay upstream.                                        |
| `packages/worker/start/pages/contact.tsx`                                 | Contact heading. Body still describes kody.codes contacts.                                                            |
| `packages/worker/src/app/public-content.ts`                               | Public catalog titles for docs and per-agent pages.                                                                   |
| `packages/worker/src/blog/rss.ts`                                         | RSS channel title. Channel description stays upstream.                                                                |
| `packages/worker/src/app/handlers/health.ts`                              | `/health` document title and brand label.                                                                             |
| `packages/worker/src/app/handlers/docs.ts`                                | `llms.txt` heading and opening product sentence.                                                                      |
| `packages/worker/src/app/agent-discovery.ts`                              | Home markdown, auth.md opening, 404 markdown labels, MCP card "chat app" sentence, and the homepage JSON-LD CSP hash. |
| `packages/worker/universal/home-json-ld.ts`                               | Homepage structured-data `name` and description. Canonical URL stays `https://kody.codes`.                            |
| `packages/worker/src/mcp/kody-mcp-server-info.ts`                         | MCP `serverInfo.title` display name. `name` stays `kody-mcp`.                                                         |
| `packages/worker/src/mcp-auth.ts`                                         | Browser page shown at the MCP endpoint.                                                                               |
| `packages/worker/src/oauth-handlers.ts`                                   | Standalone OAuth error eyebrow.                                                                                       |
| `packages/worker/start/pages/oauth-authorize.tsx`                         | Authorize-page eyebrow.                                                                                               |
| `packages/worker/start/pages/oauth-callback.tsx`                          | Callback-page eyebrow.                                                                                                |
| `packages/worker/universal/oauth-connect.ts`                              | "Connect with Rhino's built-in app" option detail.                                                                    |
| `packages/worker/universal/oauth-connect.node.test.ts`                    | Pins that option detail.                                                                                              |
| `packages/worker/start/pages/account-integrations-sections.tsx`           | Integrations section heading.                                                                                         |
| `packages/worker/start/components/doc-diagrams.tsx`                       | Diagram card title. CSS class names stay upstream.                                                                    |
| `packages/worker/start/markdown-view.native.node.test.ts`                 | Pins the diagram card title.                                                                                          |
| `packages/worker/start/pages/features/integrations-scenes.tsx`            | Diagram hub labels. Surrounding sentences stay upstream.                                                              |
| `packages/worker/start/components/primitive-widgets.tsx`                  | Homepage integrations widget hub label.                                                                               |     |
| `packages/worker/start/pages/acquisition/mcpGateway.tsx`                  | Diagram label, heading, and accessible name. Body paragraphs stay upstream.                                           |
| `packages/worker/start/pages/acquisition/sharedMemory.tsx`                | Example label.                                                                                                        |
| `packages/worker/universal/acquisition/metadata.ts`                       | Use-cases page title.                                                                                                 |
| `packages/worker/start/pages/acquisition/automation.tsx`                  | "Get started with Rhino" link.                                                                                        |
| `packages/worker/start/pages/acquisition/composioAlternatives.tsx`        | "Get started with Rhino" link.                                                                                        |
| `packages/worker/start/pages/acquisition/customTools.tsx`                 | "Get started with Rhino" link.                                                                                        |
| `packages/worker/start/pages/acquisition/gmail.tsx`                       | "Get started with Rhino" link.                                                                                        |
| `packages/cli/src/login-callback-page.ts`                                 | Localhost `kody login` callback brand. The `kody login` command text stays.                                           |
| `packages/cli/src/host-catalog.ts`                                        | Goose install display name. Install `id` stays `kody`.                                                                |
| `e2e/smoke.spec.ts`                                                       | Header brand link name.                                                                                               |
| `e2e/a11y.spec.ts`                                                        | Onboarding heading.                                                                                                   |
| `e2e/signup-verify-connect.spec.ts`                                       | Onboarding heading.                                                                                                   |
| `e2e/social-login.spec.ts`                                                | Onboarding heading.                                                                                                   |
| `packages/worker/src/public-content.mcp-e2e.test.ts`                      | Home markdown heading.                                                                                                |
| `packages/worker/src/origin-handler.anonymous-html-cache.mcp-e2e.test.ts` | `llms.txt` heading.                                                                                                   |

One follow-up stays out of the tree: custom-domain configuration for
`rhino.nyneelevenlabs.com`. This page does not change deploy config, domain,
Wrangler routing, or secrets.

## Pull requests

Agent pull requests use `cursor/` branches.
`.github/workflows/rhino-automerge.yml` squash-merges them after `✅ Validate`
(`.github/workflows/validate.yml`) finishes with conclusion `success`.

The workflow runs from `main` via `workflow_run`. It does not check out the pull
request. It squash-merges only when all of these are true:

- The Validate run was a `pull_request` event, and the head branch is in this
  repository and starts with `cursor/`. Fork pull requests are ignored.
- That head SHA is still the pull request's current head. The pull request is
  open against `main` and is not a draft.
- The pull request does not have the `no-automerge` label.
- GitHub reports the pull request mergeable. Merge conflicts leave it open.

A squash merge made with `GITHUB_TOKEN` does not start `push` workflows.
`🚀 Deploy (production)` (`.github/workflows/deploy.yml`) follows Validate only
for a successful `push` to `main`, so that path does not see an agent merge.
After the squash merge, this workflow dispatches Deploy on `main` with `mode`
set to `production`.

The workflow file has to be on `main` before it runs. The pull request that adds
it does not merge itself.

Before this can merge anything, the fork needs Actions enabled (including
GitHub-owned actions such as `actions/checkout`), workflow permissions set to
read and write, and squash merges allowed. Repository variable `CI_RUNNER` must
be `ubuntu-latest` unless a WarpBuild runner labeled `warp-ubuntu-latest-x64-4x`
is connected. Validate and the other heavy jobs use `vars.CI_RUNNER` and
otherwise request that Warp label, so they stay queued and Validate never goes
green. This auto-merge job itself runs on `ubuntu-latest`.

## Validation before push

`npm run validate` is the single authoritative local gate (`AGENTS.md`,
`package.json`). Run it before pushing. It includes these real scripts (see
`tools/validate-gate.ts`):

- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run docs:check`
- `npm run test:node`
- `npm run test:workers`
- `npm run test:e2e:run`
- `npm run test:mcp`

Use the matching script while iterating. A green `npm run validate` is what
"checks passed" means for the auto-merge rule: the `✅ Validate` workflow is
that same gate, split across jobs.

## Left as Kody

Ambiguous strings, or strings whose edit would churn tests or fight the next
upstream sync, stay Kody until a later pass adds them here:

- Package, worker, Wrangler, env, database, `kody:` URI, and MCP tool names.
  File and directory names, including the logo SVG and `KodyMark`.
- MCP server `name` (`kody-mcp`), Goose install `id` (`kody`), and the `kody`
  CLI command.
- `server.json` registry name, title, and `websiteUrl`.
- Hosts and mail: `kody.codes`, `api.kody.codes`, `support@kody.codes`,
  `kody@kody.codes`. Contact-page body, JSON-LD `url` / `sameAs`, and the About
  paragraph that names Kent C. Dodds as operator of kody.codes.
- Guide pages under `docs/guides/` and the sidebar labels that copy their titles
  (`What is Kody?`, `How Kody works`, `Kody Open API`, `OpenMuse and Kody`).
  Slugs such as `what-is-kody` stay. Some Rhino links point at those slugs with
  Rhino link text.
- Guide bodies, FAQ, privacy, terms, support, blog posts, and email templates in
  `packages/worker/src/app/email/messages.ts` (subjects such as "Welcome to
  Kody").
- OG descriptions, image subtitles, the blog RSS description, the docs-connect
  description in `document-head.ts`, and the Discord image title `Kody Discord`
  / "Join the Kody Discord" (that community is still upstream).
- Agent skill bodies and skill ids in `agent-discovery.ts` (`connect-kody`,
  `what-is-kody`, `kody-cli`) and the MCP prompt in
  `packages/worker/src/mcp/register-prompts.ts`.
- `## Kody Open API` discovery heading (the API host is still `api.kody.codes`).
- Longer marketing paragraphs on acquisition, feature, and legal pages.
- Mascot image alt text. The artwork files stay upstream.
- README license paragraphs (the Functional Source License names the upstream
  work).
- Outbound MCP client name `{ name: 'Kody' }` and the git-notes author name in
  `packages/worker/src/repo/publish-git-notes.ts`.
- Test fixtures that use `Kody` as sample data rather than product chrome.
