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
| `packages/worker/wrangler.jsonc`                                          | Production email domains, omitted package-app URL, no `sentry-otlp-traces` destination.                               |
| `packages/worker/worker-type-secrets.env`                                 | Keeps `PACKAGE_APP_BASE_URL` on the generated `Env` type after the wrangler pin is removed.                           |
| `packages/worker/worker-configuration.d.ts`                               | Regenerated. Email-domain pins are widened to `string` so fixture hosts still typecheck.                              |
| `tools/generate-worker-configuration-types.ts`                            | Applies that widening after `wrangler types`.                                                                         |
| `tools/widen-sentry-environment-type.ts`                                  | Widens the committed `USER_EMAIL_DOMAIN` and `SYSTEM_EMAIL_DOMAIN` literals.                                          |
| `tools/widen-sentry-environment-type.node.test.ts`                        | Pins that widening.                                                                                                   |
| `packages/runtime-worker/wrangler.jsonc`                                  | Omits `PACKAGE_APP_BASE_URL` and the Sentry trace destination.                                                        |
| `packages/platform-worker/wrangler.jsonc`                                 | Omits the Sentry trace destination.                                                                                   |
| `packages/status/wrangler.jsonc`                                          | Status hostname, probe origins, alert from-address, and Cloudflare account id.                                        |
| `packages/status/probes.ts`                                               | A blank package-app origin does not probe and does not open an incident.                                              |
| `packages/status/probes.node.test.ts`                                     | Pins that blank-origin behavior.                                                                                      |
| `packages/api-worker/wrangler.jsonc`                                      | API custom domain.                                                                                                    |
| `packages/api-docs-worker/wrangler.jsonc`                                 | API docs custom domain and spec URL.                                                                                  |
| `packages/nx-cache/wrangler.jsonc`                                        | Nx cache custom domain.                                                                                               |
| `tools/ci/resource-utils.ts`                                              | Publishes the app custom domain when `PACKAGE_APP_BASE_URL` is unset.                                                 |
| `tools/ci/resource-utils.node.test.ts`                                    | Covers that route shape and still rejects a package-app URL without an app origin.                                    |
| `tools/ci/production-resources.ts`                                        | `APP_BASE_URL` fallback and optional `PACKAGE_APP_BASE_URL` Actions variable.                                         |
| `tools/nx-remote-cache-probe.ts`                                          | Default Nx cache server hostname.                                                                                     |
| `.github/workflows/deploy.yml`                                            | Production hostnames, app-origin fallback, and the DR job skip.                                                       |
| `.github/workflows/nx-cache-deploy.yml`                                   | Nx cache hostname and skip when the write token is absent.                                                            |
| `.github/workflows/cla.yml`                                               | CLA jobs run only on `kody-hq/kody`.                                                                                  |
| `.github/workflows/weekly-site-perf.yml`                                  | Weekly site perf runs only on `kody-hq/kody`.                                                                         |
| `.github/workflows/latency-bench.yml`                                     | Weekly latency bench runs only on `kody-hq/kody`.                                                                     |
| `.github/workflows/publish-cli.yml`                                       | CLI publish runs only on `kody-hq/kody`.                                                                              |
| `.github/workflows/publish-mcp-registry.yml`                              | MCP registry publish runs only on `kody-hq/kody`.                                                                     |
| `.github/workflows/status-incident-delete.yml`                            | Status incident delete URL, secret skip, and `cameron-nye` as an approved actor.                                      |
| `.github/workflows/dr-escrow.yml`                                         | Escrow job skips when DR credentials are absent.                                                                      |

Production hostnames and the CI skips for this fork are in
[Production hostnames](#production-hostnames). Product copy still names upstream
hosts; see Left as Kody.

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
- Hosts and mail in product copy: `kody.codes`, `api.kody.codes`,
  `support@kody.codes`, `kody@kody.codes`. Production routing is in
  [Production hostnames](#production-hostnames). Contact-page body, JSON-LD
  `url` / `sameAs`, and the About paragraph that names Kent C. Dodds as operator
  of kody.codes.
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
- `## Kody Open API` discovery heading (discovery copy still says
  `api.kody.codes`).
- Longer marketing paragraphs on acquisition, feature, and legal pages.
- Mascot image alt text. The artwork files stay upstream.
- README license paragraphs (the Functional Source License names the upstream
  work).
- Outbound MCP client name `{ name: 'Kody' }` and the git-notes author name in
  `packages/worker/src/repo/publish-git-notes.ts`.
- Test fixtures that use `Kody` as sample data rather than product chrome.

## Production hostnames

All of these names are on the zone `nyneelevenlabs.com` (zone id
`b5451c2715afa787ba188025ebf929a0`, account `fc56d8089384bf6a7806ff0e9a9385a0`).
Workers custom domains issue their own certificates, so the nested names below
are not limited to Universal SSL's one label. GitHub Actions variables
`APP_BASE_URL`, `USER_EMAIL_DOMAIN`, and `SYSTEM_EMAIL_DOMAIN` still override
the committed pins when they are non-empty. Upstream values stay in comments
next to the pins.

| Role                 | Name                                                         | Upstream                      |
| -------------------- | ------------------------------------------------------------ | ----------------------------- |
| App (`APP_BASE_URL`) | `https://rhino.nyneelevenlabs.com`                           | `https://kody.codes`          |
| System email         | `rhino.nyneelevenlabs.com` (`kody@rhino.nyneelevenlabs.com`) | `kody.codes`                  |
| User email           | `inbox.rhino.nyneelevenlabs.com`                             | `inbox.kody.codes`            |
| Status               | `https://status.rhino.nyneelevenlabs.com`                    | `https://status.kody.codes`   |
| Open API             | `https://api.rhino.nyneelevenlabs.com`                       | `https://api.kody.codes`      |
| API docs             | `https://api-docs.rhino.nyneelevenlabs.com`                  | `https://api-docs.kody.codes` |
| Nx cache             | `https://nx-cache.rhino.nyneelevenlabs.com`                  | `https://nx-cache.kody.codes` |
| Hosted package apps  | unset                                                        | `https://kody.run`            |

Hosted package apps stay off. Production package-app requests return 500 until
`PACKAGE_APP_BASE_URL` is a separate registrable domain. Preview, tests, and
local dev still serve package apps inline. A subdomain of `nyneelevenlabs.com`
is not a stand-in: it shares a registrable domain with the app (so the isolation
check fails) and the runtime worker would publish zone routes, including a
catch-all, on this zone. That replaces the zone route table and detaches every
Workers custom domain here, including the app. Leaving `https://kody.run` in the
committed config would make production ensure look up that zone in this account
and fail the origin deploy. Set the `PACKAGE_APP_BASE_URL` Actions variable only
after this account owns that second zone. Do not point it at `kody.run`.

The status worker's package-runtime card stays operational while the origin is
blank, so a missing domain does not open an incident. It is not serving package
apps.

`ALERT_EMAIL_TO` is still `me@kentcdodds.com`. Change it before relying on
status alerts. The from-address is `kody@rhino.nyneelevenlabs.com`.

### CI that does not run here

These jobs use `if: github.repository == 'kody-hq/kody'`, the same guard as
audit bump and preview sweep:

- CLA (`cla.yml`). This fork has no `cla-signatures` branch.
- Weekly site perf (`weekly-site-perf.yml`). It measures `kody.codes`.
- Weekly MCP latency bench (`latency-bench.yml`).
- CLI publish (`publish-cli.yml`) and MCP registry publish
  (`publish-mcp-registry.yml`).

Job-level `if` cannot read `secrets` (GitHub rejects the workflow). These checks
live where the secrets context is allowed, and an empty secret skips the work
instead of failing the run:

- `deploy-backup-control-plane` stays skipped unless `DR_DEPLOY_TOKEN` and
  `DR_BACKUP_ACCOUNT_ID` are both set. The production deploy guard writes
  `deploy_backup_control_plane=false` in that case. Its wrangler file still
  names Kent's DR account, `https://kody.codes`, and
  `https://kody-dr.kentcdodds.com`. Do not set those secrets until that file is
  retargeted.
- DR secret escrow (`dr-escrow.yml`) skips its steps without the escrow
  passphrase and `DR_BACKUP_*` credentials.
- Nx cache deploy (`nx-cache-deploy.yml`) skips its steps without
  `NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN`. Production deploy also withholds
  the workflow call when that secret is unset, so it does not ensure the R2
  bucket first.
- Status incident delete skips its steps without `STATUS_INCIDENT_EVENT_SECRET`.

Per-PR preview deploys stay enabled. Preview sweep and audit bump stay
upstream-only, so closed-PR preview cleanup does not run on this fork.

### Before the first production deploy

Dashboard and one-time resources this deploy does not create:

- Vectorize index `kody-capabilities-prod` (384 dimensions, cosine).
- Email Sending verification for `rhino.nyneelevenlabs.com` and
  `inbox.rhino.nyneelevenlabs.com`.
- Email Routing on the zone: MX, the `inbox.rhino` subdomain, and a catch-all on
  that subdomain to the origin Worker. `dmarc@rhino.nyneelevenlabs.com` needs a
  verified destination. Set Actions variable `DMARC_REPORT_FORWARD_TO` to that
  address. The default forward target is `me@kentcdodds.com`, and ensure fails
  if that destination is not verified on this account (a 403 from the routing
  API skips the rule instead).
- DMARC TXT is written by deploy (`rua=mailto:dmarc@rhino.nyneelevenlabs.com`).
- Workers Observability destination `sentry-otlp-traces`, then put
  `destinations` back on the production trace blocks. Until then, traces stay in
  the Workers Observability dashboard and are not exported.
- `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` on the production Worker.
  Production boot refuses to start without them.
- Worker API tokens `CLOUDFLARE_APP_API_TOKEN`, `CLOUDFLARE_RUNTIME_API_TOKEN`,
  and `CLOUDFLARE_STATUS_API_TOKEN`, distinct from `CLOUDFLARE_API_TOKEN`.
  Deploy fails in `require-worker-tokens` when any of them is missing.

`npm run dev` still uses the production Wrangler environment, so the committed
email domains are visible locally. `APP_BASE_URL` is not committed; local dev
keeps using localhost. The production deploy writes
`https://rhino.nyneelevenlabs.com` when the Actions variable is empty.
