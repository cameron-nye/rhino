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

| File                                                                      | Why                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/contributing/rhino.md`                                              | Additive fork rules (this page).                                                                                                                                                                                                                                                                        |
| `.github/workflows/rhino-automerge.yml`                                   | Squash-merge same-repo `cursor/` pull requests only when `user.login` is `cameron-nye`, Validate succeeded, and Cursor Bugbot is success or neutral with no unresolved Bugbot threads, unless `RHINO_REQUIRE_BUGBOT` is off. Then dispatch production deploy and preview cleanup.                       |
| `tools/ci/rhino-automerge-workflow.node.test.ts`                          | Pins automerge gates: Validate, Cursor Bugbot unless `RHINO_REQUIRE_BUGBOT` is off, unresolved Bugbot threads, and preview cleanup that does not fail the merge.                                                                                                                                        |
| `AGENTS.md`                                                               | Opening pointer to this page. Stays inside the 23-line `agents-md` budget.                                                                                                                                                                                                                              |
| `docs/contributing/index.md`                                              | Link to this page from the contributing map, including the fork friction route.                                                                                                                                                                                                                         |
| `.agents/skills/rhino-friction/SKILL.md`                                  | Additive. Agents file friction on `cameron-nye/rhino` with `gh`, labeled `friction`, `friction-skipped`, or `improvement`.                                                                                                                                                                              |
| `.agents/skills/rhino-ship-pr/SKILL.md`                                   | Additive. Agents wait for Cursor Bugbot, fix or answer it, and do not call Kent's ship-pr package or Discord.                                                                                                                                                                                           |
| `.agents/skills/file-friction/SKILL.md`                                   | Guard sends this fork to rhino-friction. Upstream friction-log steps stay below the guard.                                                                                                                                                                                                              |
| `.agents/skills/ship-pr/SKILL.md`                                         | Guard sends this fork to rhino-ship-pr. Upstream tick stays below the guard.                                                                                                                                                                                                                            |
| `skills-lock.json`                                                        | ship-pr folder hash after the Rhino guard.                                                                                                                                                                                                                                                              |
| `packages/cli/.agents/skills/ship-pr/SKILL.md`                            | Guard so the CLI copy of ship-pr does not post to Kent's Discord or repositories.                                                                                                                                                                                                                       |
| `packages/cli/AGENTS.md`                                                  | Points CLI work at rhino-ship-pr before the upstream ship-pr skill.                                                                                                                                                                                                                                     |
| `docs/contributing/friction-log.md`                                       | Guard: this fork files friction on `cameron-nye/rhino` and does not call Kent's package.                                                                                                                                                                                                                |
| `docs/contributing/cloud-agents.md`                                       | Guard: do not use the kody-bot GitHub write path from this fork.                                                                                                                                                                                                                                        |
| `README.md`                                                               | Headline, logo alt text, and the opening product paragraphs. License text stays upstream.                                                                                                                                                                                                               |
| `packages/worker/start/components/site-header.tsx`                        | Header wordmark, in self-hosted Saira Stencil One. Personal-use mode hides marketing nav and points the brand at login or the workspace dashboard.                                                                                                                                                      |
| `packages/worker/start/components/site-footer.tsx`                        | Footer wordmark, in self-hosted Saira Stencil One. Personal-use mode hides marketing links and points the brand at the same home.                                                                                                                                                                       |
| `packages/worker/start/components/workspace-layout.tsx`                   | Sidebar wordmark and home label, in Saira Stencil One.                                                                                                                                                                                                                                                  |
| `packages/worker/start/pages/login-sections.tsx`                          | Sign-in wordmark is Saira Stencil One. The lantern glow stays off this stage. The brand link stays on login in personal-use mode.                                                                                                                                                                       |
| `packages/worker/universal/styles/style-primitives.ts`                    | Login lantern glow is removed. It sat under the Rhino jet.                                                                                                                                                                                                                                              |
| `packages/worker/start/pages/login.tsx`                                   | "Back to Rhino" is omitted in personal-use mode. Privacy and terms stay linked. The account-deleted confirmation renders here.                                                                                                                                                                          |
| `packages/worker/start/pages/signup-choose-username.tsx`                  | "Back to Rhino" points at login in personal-use mode.                                                                                                                                                                                                                                                   |
| `packages/worker/start/components/brand-context-menu.tsx`                 | Brand menu name. Copied SVG uses the Rhino colors.                                                                                                                                                                                                                                                      |
| `packages/worker/universal/document-head.ts`                              | Default title and page-title / share-title product suffix. Share-card URLs use `v=4` so crawlers refetch the Rhino art.                                                                                                                                                                                 |
| `packages/worker/universal/og-pages.ts`                                   | Share-card titles and image titles that name the product. Descriptions stay upstream.                                                                                                                                                                                                                   |
| `packages/worker/start/routes/__root.tsx`                                 | Document title, brand-font preload, and the favicon comment. Personal-use mode redirects client navigations off marketing routes and sets the footer home.                                                                                                                                              |
| `packages/worker/start/routes/unsubscribe.tips.tsx`                       | Fallback document title.                                                                                                                                                                                                                                                                                |
| `packages/worker/start/routes/verify-email.tsx`                           | Fallback document title.                                                                                                                                                                                                                                                                                |
| `packages/worker/start/routes/verify-email-change.tsx`                    | Fallback document title.                                                                                                                                                                                                                                                                                |
| `packages/worker/start/routes/verify-email-claim-release.tsx`             | Fallback document title.                                                                                                                                                                                                                                                                                |
| `packages/worker/start/routes/verify-email-destination.tsx`               | Fallback document title.                                                                                                                                                                                                                                                                                |
| `packages/worker/universal/landing-home-copy.ts`                          | Homepage product-name sentences. Other wording stays the upstream homepage.                                                                                                                                                                                                                             |
| `packages/worker/start/components/landing-agent-marquee.tsx`              | Homepage accessible name.                                                                                                                                                                                                                                                                               |
| `packages/worker/start/components/landing-hero-agents.tsx`                | Homepage accessible name.                                                                                                                                                                                                                                                                               |
| `packages/worker/start/components/landing-lantern.tsx`                    | Homepage caption.                                                                                                                                                                                                                                                                                       |
| `packages/worker/start/components/landing-loop-player.tsx`                | Homepage section title.                                                                                                                                                                                                                                                                                 |
| `packages/worker/start/pages/onboarding.tsx`                              | Onboarding heading.                                                                                                                                                                                                                                                                                     |
| `packages/worker/start/pages/onboarding-banner.tsx`                       | Onboarding banner accessible name.                                                                                                                                                                                                                                                                      |
| `packages/worker/start/pages/about.tsx`                                   | About heading and the product-definition paragraphs. Host facts stay upstream.                                                                                                                                                                                                                          |
| `packages/worker/start/pages/privacy.tsx`                                 | Personal-use mode hides the pricing link and points the closing link at login.                                                                                                                                                                                                                          |
| `packages/worker/start/pages/contact.tsx`                                 | Contact heading. Body still describes kody.codes contacts.                                                                                                                                                                                                                                              |
| `packages/worker/src/app/public-content.ts`                               | Public catalog titles for docs and per-agent pages.                                                                                                                                                                                                                                                     |
| `packages/worker/src/blog/rss.ts`                                         | RSS channel title. Channel description stays upstream.                                                                                                                                                                                                                                                  |
| `packages/worker/src/app/handlers/health.ts`                              | `/health` document title and brand label.                                                                                                                                                                                                                                                               |
| `packages/worker/src/app/handlers/docs.ts`                                | `llms.txt` heading and opening product sentence.                                                                                                                                                                                                                                                        |
| `packages/worker/src/app/agent-discovery.ts`                              | Home markdown, auth.md opening, 404 markdown labels, MCP card "chat app" sentence, and the homepage JSON-LD CSP hash.                                                                                                                                                                                   |
| `packages/worker/universal/home-json-ld.ts`                               | Homepage structured-data `name` and description. Canonical URL stays `https://kody.codes`.                                                                                                                                                                                                              |
| `packages/worker/src/mcp/kody-mcp-server-info.ts`                         | MCP `serverInfo.title` display name. `name` stays `kody-mcp`.                                                                                                                                                                                                                                           |
| `packages/worker/src/mcp-auth.ts`                                         | Browser page shown at the MCP endpoint.                                                                                                                                                                                                                                                                 |
| `packages/worker/src/oauth-handlers.ts`                                   | Standalone OAuth error eyebrow.                                                                                                                                                                                                                                                                         |
| `packages/worker/start/pages/oauth-authorize.tsx`                         | Authorize-page eyebrow.                                                                                                                                                                                                                                                                                 |
| `packages/worker/start/pages/oauth-callback.tsx`                          | Callback-page eyebrow.                                                                                                                                                                                                                                                                                  |
| `packages/worker/universal/oauth-connect.ts`                              | "Connect with Rhino's built-in app" option detail.                                                                                                                                                                                                                                                      |
| `packages/worker/universal/oauth-connect.node.test.ts`                    | Pins that option detail.                                                                                                                                                                                                                                                                                |
| `packages/worker/start/pages/account-integrations-sections.tsx`           | Integrations section heading.                                                                                                                                                                                                                                                                           |
| `packages/worker/start/components/doc-diagrams.tsx`                       | Diagram card title. CSS class names stay upstream.                                                                                                                                                                                                                                                      |
| `packages/worker/start/markdown-view.native.node.test.ts`                 | Pins the diagram card title.                                                                                                                                                                                                                                                                            |
| `packages/worker/start/pages/features/integrations-scenes.tsx`            | Diagram hub labels. Surrounding sentences stay upstream.                                                                                                                                                                                                                                                |
| `packages/worker/start/components/primitive-widgets.tsx`                  | Homepage integrations widget hub label.                                                                                                                                                                                                                                                                 |     |
| `packages/worker/start/pages/acquisition/mcpGateway.tsx`                  | Diagram label, heading, and accessible name. Body paragraphs stay upstream.                                                                                                                                                                                                                             |
| `packages/worker/start/pages/acquisition/sharedMemory.tsx`                | Example label.                                                                                                                                                                                                                                                                                          |
| `packages/worker/universal/acquisition/metadata.ts`                       | Use-cases page title.                                                                                                                                                                                                                                                                                   |
| `packages/worker/start/pages/acquisition/automation.tsx`                  | "Get started with Rhino" link.                                                                                                                                                                                                                                                                          |
| `packages/worker/start/pages/acquisition/composioAlternatives.tsx`        | "Get started with Rhino" link.                                                                                                                                                                                                                                                                          |
| `packages/worker/start/pages/acquisition/customTools.tsx`                 | "Get started with Rhino" link.                                                                                                                                                                                                                                                                          |
| `packages/worker/start/pages/acquisition/gmail.tsx`                       | "Get started with Rhino" link.                                                                                                                                                                                                                                                                          |
| `packages/cli/src/login-callback-page.ts`                                 | Localhost login callback: Rhino jet and RHINO wordmark. `kody login` text stays.                                                                                                                                                                                                                        |
| `packages/cli/src/host-catalog.ts`                                        | Goose install display name. Install `id` stays `kody`.                                                                                                                                                                                                                                                  |
| `e2e/smoke.spec.ts`                                                       | Header brand link name. Signed-out marketing URLs land on login, and Pricing and Blog links are absent.                                                                                                                                                                                                 |
| `e2e/a11y.spec.ts`                                                        | Onboarding heading.                                                                                                                                                                                                                                                                                     |
| `e2e/signup-verify-connect.spec.ts`                                       | Onboarding heading. Account deletion lands on login with the confirmation query.                                                                                                                                                                                                                        |
| `e2e/social-login.spec.ts`                                                | Onboarding heading.                                                                                                                                                                                                                                                                                     |
| `packages/worker/src/public-content.mcp-e2e.test.ts`                      | Marketing documents redirect to login or the workspace dashboard. Privacy SSR stays.                                                                                                                                                                                                                    |
| `packages/worker/src/origin-handler.anonymous-html-cache.mcp-e2e.test.ts` | Anonymous HTML cache is exercised on login. Marketing docs and llms.txt redirect to login.                                                                                                                                                                                                              |
| `packages/worker/wrangler.jsonc`                                          | Production email domains, package-app apex `https://nyneelevenlabs.dev`, no Fathom site id, no Stripe prices, no YouTube playlist, no disaster-recovery account, no `sentry-otlp-traces` destination.                                                                                                   |
| `packages/worker/src/orgs/create-organization.node.test.ts`               | Soft-deleted org fixture stays inside the 30-day restore window.                                                                                                                                                                                                                                        |
| `packages/worker/worker-type-secrets.env`                                 | Keeps `FATHOM_SITE_ID`, Stripe, YouTube, and disaster-recovery names on the generated `Env` type after those wrangler pins are removed.                                                                                                                                                                 |
| `packages/worker/worker-configuration.d.ts`                               | Regenerated. Email-domain and package-app URL pins are widened to `string` so fixture hosts still typecheck.                                                                                                                                                                                            |
| `tools/generate-worker-configuration-types.ts`                            | Applies that widening after `wrangler types`.                                                                                                                                                                                                                                                           |
| `tools/widen-sentry-environment-type.ts`                                  | Widens the committed email-domain and `PACKAGE_APP_BASE_URL` literals.                                                                                                                                                                                                                                  |
| `tools/widen-sentry-environment-type.node.test.ts`                        | Pins that widening.                                                                                                                                                                                                                                                                                     |
| `packages/runtime-worker/wrangler.jsonc`                                  | Inherits `PACKAGE_APP_BASE_URL` from the main worker and omits the Sentry trace destination.                                                                                                                                                                                                            |
| `packages/platform-worker/wrangler.jsonc`                                 | Omits the Sentry trace destination.                                                                                                                                                                                                                                                                     |
| `packages/status/wrangler.jsonc`                                          | Status hostname, probe origins, alert addresses, and Cloudflare account id.                                                                                                                                                                                                                             |
| `packages/status/probes.ts`                                               | A blank package-app origin does not probe and does not open an incident.                                                                                                                                                                                                                                |
| `packages/status/probes.node.test.ts`                                     | Pins that blank-origin behavior.                                                                                                                                                                                                                                                                        |
| `packages/api-worker/wrangler.jsonc`                                      | API custom domain.                                                                                                                                                                                                                                                                                      |
| `packages/api-docs-worker/wrangler.jsonc`                                 | API docs custom domain and spec URL.                                                                                                                                                                                                                                                                    |
| `packages/nx-cache/wrangler.jsonc`                                        | Nx cache custom domain.                                                                                                                                                                                                                                                                                 |
| `tools/ci/resource-utils.ts`                                              | Publishes the app custom domain when `PACKAGE_APP_BASE_URL` is unset. DMARC reports forward to `csnye86@gmail.com`, and an existing `_dmarc` TXT is updated in place.                                                                                                                                   |
| `tools/ci/resource-utils.node.test.ts`                                    | Covers the pinned package-app apex, the DMARC forward default, in-place DMARC TXT updates, a package-app URL without an app origin, and a disabled paced-backup lane that does not invent D1 ids.                                                                                                       |
| `tools/ci/production-resources.ts`                                        | `APP_BASE_URL` and `PACKAGE_APP_BASE_URL` fallbacks, and an optional Fathom site id.                                                                                                                                                                                                                    |
| `tools/nx-remote-cache-probe.ts`                                          | Default Nx cache server hostname.                                                                                                                                                                                                                                                                       |
| `.github/workflows/deploy.yml`                                            | Production hostnames, app and package-app origin fallbacks, optional Fathom site id, the DR job skip, and fresh-account worker bootstrap. Origin bootstrap runs only when `origin_bootstrap` is true. Origin secret sync copies `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` onto `kody-production`. |
| `.github/workflows/validate.yml`                                          | 🧹 Static sets `NODE_OPTIONS=--max-old-space-size=6144` and a 15-minute timeout. 🧪 Node on `ubuntu-latest` uses 20 minutes and `--runner ubuntu-latest`.                                                                                                                                               |
| `.github/workflows/nx-cache-deploy.yml`                                   | Nx cache hostname and skip when the write token is absent.                                                                                                                                                                                                                                              |
| `.github/workflows/cla.yml`                                               | CLA jobs run only on `kody-hq/kody`.                                                                                                                                                                                                                                                                    |
| `.github/workflows/weekly-site-perf.yml`                                  | Weekly site perf runs only on `kody-hq/kody`.                                                                                                                                                                                                                                                           |
| `.github/workflows/latency-bench.yml`                                     | Weekly latency bench runs only on `kody-hq/kody`.                                                                                                                                                                                                                                                       |
| `.github/workflows/publish-cli.yml`                                       | CLI publish runs only on `kody-hq/kody`.                                                                                                                                                                                                                                                                |
| `.github/workflows/publish-mcp-registry.yml`                              | MCP registry publish runs only on `kody-hq/kody`.                                                                                                                                                                                                                                                       |
| `.github/workflows/status-incident-delete.yml`                            | Status incident delete URL, secret skip, and `cameron-nye` as an approved actor.                                                                                                                                                                                                                        |
| `.github/workflows/dr-escrow.yml`                                         | Escrow job always skips. Upstream runs it when DR credentials are set.                                                                                                                                                                                                                                  |
| `tools/ci/jobs-worker-resources.ts`                                       | Fresh account creates `JobManager` in place and deploys jobs without `HOST` until `kody-production` exists.                                                                                                                                                                                             |
| `tools/ci/jobs-worker-resources.node.test.ts`                             | Pins that jobs plan.                                                                                                                                                                                                                                                                                    |
| `tools/ci/origin-production-deploy-state.ts`                              | A fresh account whose origin, platform, and runtime scripts implement none of the transferred Durable Object classes skips origin bootstrap. Platform and runtime create those classes in place.                                                                                                        |
| `tools/ci/origin-production-deploy-state.node.test.ts`                    | Audits that chain: slim origin, in-place platform, in-place runtime, then the slim origin bindings. Also pins the origin-bootstrap omission of classes its migrations do not create.                                                                                                                    |
| `tools/ci/platform-worker-config.ts`                                      | Production platform migrations create Durable Object classes in place instead of transferring them from `kody-production`.                                                                                                                                                                              |
| `tools/ci/platform-worker-config.node.test.ts`                            | Pins that in-place platform migration.                                                                                                                                                                                                                                                                  |
| `tools/ci/runtime-worker-config.ts`                                       | Production runtime creates `StorageRunner`, `RunLog`, and `PackageRealtimeSession` in place, and does not transfer deleted `PackageServiceInstance`.                                                                                                                                                    |
| `tools/ci/runtime-worker-config.node.test.ts`                             | Pins that runtime migration.                                                                                                                                                                                                                                                                            |
| `tools/ci/deploy-workflow-contract.ts`                                    | Contract bump so older checkouts are not deployed with the fresh-account workflow.                                                                                                                                                                                                                      |
| `tools/ci/enforce-unit-job-budget.ts`                                     | `ubuntu-latest` Node shards use watch 960s / hard 1080s. 4x runners keep watch 700s / hard 840s. Workers stay on the 4x ceiling.                                                                                                                                                                        |
| `tools/check-worker-startup-time.ts`                                      | A Wrangler startup-profile timeout warns instead of failing CI. `ubuntu-latest` cannot finish the origin profile inside Wrangler's hard 10s limit.                                                                                                                                                      |
| `tools/check-worker-startup-time.node.test.ts`                            | Pins that timeout warning, and that any other profiler error still fails.                                                                                                                                                                                                                               |
| `packages/worker/start/brand/rhino-mark.ts`                               | Additive jet geometry, colors, and the outlined RHINO wordmark.                                                                                                                                                                                                                                         |
| `packages/worker/start/brand/rhino-personal.ts`                           | Personal-use switch. Lists marketing paths and the login or workspace-dashboard home. Set the flag false to restore the public site.                                                                                                                                                                    |
| `packages/worker/start/brand/rhino-personal.node.test.ts`                 | Pins which paths are marketing and which stay reachable.                                                                                                                                                                                                                                                |
| `packages/worker/start/server/rhino-marketing-redirect.ts`                | 302 for a marketing document. The referral cookie still applies.                                                                                                                                                                                                                                        |
| `packages/worker/start/server/rhino-marketing.ts`                         | Server function so a client navigation uses the same home as the document redirect.                                                                                                                                                                                                                     |
| `packages/worker/tsconfig-worker.json`                                    | Worker typecheck includes the personal-use redirect modules the HTTP entry imports.                                                                                                                                                                                                                     |
| `packages/worker/start/http-entry.ts`                                     | Personal-use mode returns that 302 before Start renders a marketing document.                                                                                                                                                                                                                           |
| `packages/worker/start/http-entry.node.test.ts`                           | Pins the marketing-document redirect and that other paths still render.                                                                                                                                                                                                                                 |
| `packages/worker/start/server-isolation.node.test.ts`                     | Overlapping-request fixture uses login and privacy so both requests render.                                                                                                                                                                                                                             |
| `e2e/admin-rbac.spec.ts`                                                  | Admin link is opened from privacy, because personal-use mode redirects the site root.                                                                                                                                                                                                                   |
| `packages/worker/start/brand/kody-mark-path.ts`                           | Mark and favicon helpers delegate to the Rhino jet. Names stay.                                                                                                                                                                                                                                         |
| `packages/worker/start/brand/kody-logo.ts`                                | Logo SVG is the jet plus the outlined RHINO wordmark.                                                                                                                                                                                                                                                   |
| `packages/worker/start/components/kody-mark.tsx`                          | Inline mark renders the jet. Component name stays `KodyMark`.                                                                                                                                                                                                                                           |
| `packages/worker/start/brand/kody-mark-path.node.test.ts`                 | Pins the Rhino mark SVG instead of the koala outline.                                                                                                                                                                                                                                                   |
| `packages/worker/start/brand/kody-logo.node.test.ts`                      | Pins the Rhino logo SVG and its PNG aspect.                                                                                                                                                                                                                                                             |
| `packages/worker/start/brand/favicon-assets.node.test.ts`                 | Pins the tiled Rhino favicon instead of the koala outline.                                                                                                                                                                                                                                              |
| `packages/worker/src/og/og-kody-mark.node.test.ts`                        | OG mark and header lockup keep the orange horn instead of a flat tint.                                                                                                                                                                                                                                  |
| `packages/worker/src/og/og-binary-assets.ts`                              | OG mark and lockup are not retinted, so the horn stays orange. The agents and Discord stills are the Rhino pilot.                                                                                                                                                                                       |
| `packages/worker/src/og/og-binary-assets.node.ts`                         | Node twin of the OG mark and lockup. The horn stays orange. The agents and Discord stills are the Rhino pilot.                                                                                                                                                                                          |
| `packages/worker/public/styles.css`                                       | Self-hosts Saira Stencil One for the brand wordmark only.                                                                                                                                                                                                                                               |
| `packages/worker/public/site.webmanifest`                                 | Installed-app name and short name are Rhino.                                                                                                                                                                                                                                                            |
| `packages/worker/start/pages/brand-guide.tsx`                             | Brand guide describes the jet. The page stays.                                                                                                                                                                                                                                                          |
| `packages/worker/src/app/email/template.ts`                               | Email logo alt text is Rhino. Message copy stays Kody.                                                                                                                                                                                                                                                  |
| `packages/worker/src/app/email/template.node.test.ts`                     | Pins the Rhino email logo alt text.                                                                                                                                                                                                                                                                     |
| `packages/worker/start/components/not-found-page.tsx`                     | 404 alt text describes the Rhino pilot.                                                                                                                                                                                                                                                                 |
| `packages/worker/start/components/package-no-access-page.tsx`             | No-access alt text describes the Rhino pilot.                                                                                                                                                                                                                                                           |
| `packages/worker/universal/internal-error-page.ts`                        | 500 alt text describes the Rhino pilot.                                                                                                                                                                                                                                                                 |
| `packages/cli/src/login-callback-assets.ts`                               | Drops the koala PNG. Inlines the RHINO font subset and jet markup.                                                                                                                                                                                                                                      |
| `packages/worker/start/pages/business.tsx`                                | Business nav lockup says RHINO. Page copy otherwise stays.                                                                                                                                                                                                                                              |
| `packages/worker/start/pages/business-styles.ts`                          | Business nav lockup uses Saira Stencil One.                                                                                                                                                                                                                                                             |
| `packages/worker/start/pages/onboarding-mcp-client-cards.tsx`             | App-icon alt text says Rhino. The PNG filename stays.                                                                                                                                                                                                                                                   |
| `tools/generate-tab-favicons.ts`                                          | Writes favicon.svg only. PNG and ICO masters stay official files.                                                                                                                                                                                                                                       |
| `packages/worker/public/favicon.svg`                                      | Rhino jet on the dark rounded tile.                                                                                                                                                                                                                                                                     |
| `packages/worker/public/favicon.ico`                                      | Official Rhino app icon, 16, 32, and 48.                                                                                                                                                                                                                                                                |
| `packages/worker/public/favicon-16x16.png`                                | Official Rhino app icon at 16px. Light and dark match.                                                                                                                                                                                                                                                  |
| `packages/worker/public/favicon-32x32.png`                                | Official Rhino app icon at 32px.                                                                                                                                                                                                                                                                        |
| `packages/worker/public/favicon-16x16-dark.png`                           | Same tiled Rhino icon. The master set has one tile.                                                                                                                                                                                                                                                     |
| `packages/worker/public/favicon-32x32-dark.png`                           | Same tiled Rhino icon as the light 32px file.                                                                                                                                                                                                                                                           |
| `packages/worker/public/apple-touch-icon.png`                             | Official Rhino apple touch icon.                                                                                                                                                                                                                                                                        |
| `packages/worker/public/android-chrome-192x192.png`                       | Official Rhino PWA icon, 192.                                                                                                                                                                                                                                                                           |
| `packages/worker/public/android-chrome-512x512.png`                       | Official Rhino PWA icon, 512.                                                                                                                                                                                                                                                                           |
| `packages/worker/public/logo.png`                                         | Rhino app icon used as the OAuth logo.                                                                                                                                                                                                                                                                  |
| `packages/worker/public/logo-64.webp`                                     | Rhino app icon at 64.                                                                                                                                                                                                                                                                                   |
| `packages/worker/public/logo-240.webp`                                    | Rhino app icon at 240.                                                                                                                                                                                                                                                                                  |
| `packages/worker/public/logo-336.webp`                                    | Rhino app icon at 336.                                                                                                                                                                                                                                                                                  |
| `packages/worker/public/logo-480.webp`                                    | Rhino app icon at 480.                                                                                                                                                                                                                                                                                  |
| `packages/worker/public/images/kody-mark.png`                             | Small Rhino mark. Filename stays.                                                                                                                                                                                                                                                                       |
| `packages/worker/public/images/kody-app-icon.png`                         | Rhino app icon at 256. Filename stays.                                                                                                                                                                                                                                                                  |
| `packages/worker/public/images/kody-404-disappointed.png`                 | 404 character image is the Rhino pilot. Filename stays.                                                                                                                                                                                                                                                 |
| `packages/worker/public/images/kody-500-zapped.png`                       | 500 character image is the Rhino pilot. Filename stays.                                                                                                                                                                                                                                                 |
| `packages/worker/public/images/brand/kody-mark-white.svg`                 | Dark-surface Rhino mark. Filename stays.                                                                                                                                                                                                                                                                |
| `packages/worker/public/images/brand/kody-mark-outlined.svg`              | Light-surface Rhino mark. Filename stays.                                                                                                                                                                                                                                                               |
| `packages/worker/public/images/brand/kody-mark-white.png`                 | Dark-surface Rhino mark PNG.                                                                                                                                                                                                                                                                            |
| `packages/worker/public/images/brand/kody-mark-outlined.png`              | Light-surface Rhino mark PNG.                                                                                                                                                                                                                                                                           |
| `packages/worker/public/images/brand/kody-mark-solid-dark.png`            | Opaque dark square of the Rhino app icon.                                                                                                                                                                                                                                                               |
| `packages/worker/public/images/brand/kody-mark-outlined-solid-light.png`  | Opaque white square of the light-surface Rhino mark.                                                                                                                                                                                                                                                    |
| `packages/worker/public/images/brand/kody-logo-white.svg`                 | Dark-surface Rhino logo. Filename stays.                                                                                                                                                                                                                                                                |
| `packages/worker/public/images/brand/kody-logo-outlined.svg`              | Light-surface Rhino logo. Filename stays.                                                                                                                                                                                                                                                               |
| `packages/worker/public/images/brand/kody-logo-white.png`                 | Dark-surface Rhino logo PNG.                                                                                                                                                                                                                                                                            |
| `packages/worker/public/images/brand/kody-logo-outlined.png`              | Light-surface Rhino logo PNG.                                                                                                                                                                                                                                                                           |
| `packages/worker/public/images/email/kody-logo-plate.png`                 | Email header plate of the light-surface Rhino logo.                                                                                                                                                                                                                                                     |
| `packages/worker/public/images/email/kody-mark-plate.png`                 | Email footer plate of the light-surface Rhino mark.                                                                                                                                                                                                                                                     |
| `packages/worker/public/bimi/kody-mark.svg`                               | BIMI mark is the Rhino jet on white. Filename stays.                                                                                                                                                                                                                                                    |
| `packages/worker/public/fonts/SairaStencilOne-Regular.ttf`                | Self-hosted Saira Stencil One for the brand wordmark.                                                                                                                                                                                                                                                   |
| `packages/worker/public/fonts/SairaStencilOne-OFL.txt`                    | OFL license for Saira Stencil One.                                                                                                                                                                                                                                                                      |
| `packages/status/public/favicon-operational.png`                          | Status favicon is the Rhino pilot with a green check.                                                                                                                                                                                                                                                   |
| `packages/status/public/favicon-down.png`                                 | Status favicon is the Rhino pilot with a red mark.                                                                                                                                                                                                                                                      |
| `packages/status/public/favicon-unknown.png`                              | Status favicon is the Rhino pilot with an amber question.                                                                                                                                                                                                                                               |
| `packages/worker/start/components/hero-stage.tsx`                         | Orbit props stay off. They cover the Rhino jet and the pilot.                                                                                                                                                                                                                                           |
| `packages/worker/universal/landing-images.ts`                             | Hero base intrinsic size matches the 1024px Rhino pilot.                                                                                                                                                                                                                                                |
| `packages/worker/src/og/agents-hero.ts`                                   | Agents share card composites chips on the Rhino pilot. The lantern glow stays off so it does not halo the cutout.                                                                                                                                                                                       |
| `packages/worker/src/og/page-image.ts`                                    | Discord share card drops the blurple wash that sat behind Clyde.                                                                                                                                                                                                                                        |
| `packages/worker/src/og/render.ts`                                        | Share-card header is the Rhino lockup (jet plus outlined RHINO) instead of the Kody wordmark.                                                                                                                                                                                                           |
| `packages/worker/src/og/og-image-assets.ts`                               | Re-exports the share-card lockup data URI.                                                                                                                                                                                                                                                              |
| `packages/worker/src/og/og-image-assets.node.ts`                          | Node twin of that re-export.                                                                                                                                                                                                                                                                            |
| `packages/worker/public/images/hero/kody-base.webp`                       | Stage base is the Rhino pilot with the jet. Filename stays.                                                                                                                                                                                                                                             |
| `packages/worker/public/images/hero/kody-base-960.webp`                   | Same Rhino pilot at 960. Filename stays.                                                                                                                                                                                                                                                                |
| `packages/worker/public/images/hero/kody-base-640.webp`                   | Same Rhino pilot at 640. Filename stays.                                                                                                                                                                                                                                                                |
| `packages/worker/public/og/kody-base.png`                                 | Agents share still is the Rhino pilot with the jet. Filename stays.                                                                                                                                                                                                                                     |
| `packages/worker/public/og/kody-discord.png`                              | Discord share still is the same Rhino pilot. Filename stays.                                                                                                                                                                                                                                            |
| `packages/worker/public/images/kody-factory-map-og.jpg`                   | Blog and guide share artwork is the Rhino pilot. Filename stays.                                                                                                                                                                                                                                        |
| `packages/worker/public/images/kody-gmail-drafts-lock-og.jpg`             | Blog and guide share artwork is the Rhino pilot. Filename stays.                                                                                                                                                                                                                                        |
| `packages/worker/public/images/kody-home-nas-og.jpg`                      | Blog and guide share artwork is the Rhino pilot. Filename stays.                                                                                                                                                                                                                                        |
| `packages/worker/public/images/openclaw-2-needs-a-home-og.jpg`            | Blog share artwork is the Rhino pilot. Filename stays.                                                                                                                                                                                                                                                  |
| `packages/worker/start/components/home-document-head.node.test.ts`        | Pins share-card URLs at `v=4`.                                                                                                                                                                                                                                                                          |
| `packages/worker/start/components/native-document-head.node.test.ts`      | Pins the feature-packages share-card URL at `v=4`.                                                                                                                                                                                                                                                      |
| `packages/backup-control-plane/wrangler.jsonc`                            | Backup enable gates are false. Source account, drill account, Access, allowed email, manifest key, and primary origin are blank. Worker and bucket names stay.                                                                                                                                          |
| `packages/worker/src/app/landing-hero-videos.ts`                          | Personal-use mode does not fetch the upstream homepage playlist `PLBPBUA8boGLA`.                                                                                                                                                                                                                        |
| `packages/worker/src/app/landing-hero-videos.node.test.ts`                | Fetch cases run with personal-use mode off.                                                                                                                                                                                                                                                             |
| `packages/worker/src/app/landing-hero-videos.rhino.node.test.ts`          | Pins that personal-use mode does not fetch the upstream playlist.                                                                                                                                                                                                                                       |
| `tools/disaster-recovery/trusted-d1-restore-identities.json`              | Restore allowlist is empty. Upstream trusts Kent's production D1 and the KCD drill account.                                                                                                                                                                                                             |
| `tools/disaster-recovery/trusted-backup-manifest-public-keys.json`        | Manifest public-key registry is empty. Upstream trusts key `kody-dr-2026-07`.                                                                                                                                                                                                                           |
| `tools/disaster-recovery/restore-trust-and-verification.node.test.ts`     | Pins the empty restore allowlist and the empty public-key registry.                                                                                                                                                                                                                                     |
| `tools/worker-startup-bundle-budget.json`                                 | Platform and runtime startup byte ceilings cover shared worker growth since the #3459 reset. The origin ceiling stays.                                                                                                                                                                                  |
| `tools/worker-startup-bundle-notes.md`                                    | Ledger note for those ceilings. The bytes are the shared worker graph, not a Rhino image or a new Sentry payload.                                                                                                                                                                                       |

Production hostnames and the CI skips for this fork are in
[Production hostnames](#production-hostnames). Product copy still names upstream
hosts; see Left as Kody.

## Friction

Agents in this fork file papercuts as GitHub issues on `cameron-nye/rhino`.
Follow [rhino-friction](../../.agents/skills/rhino-friction/SKILL.md).
[file-friction](../../.agents/skills/file-friction/SKILL.md) and
[ship-pr](../../.agents/skills/ship-pr/SKILL.md) stop at a Rhino guard so an
upstream sync keeps Kent's steps underneath. Ship guidance is
[rhino-ship-pr](../../.agents/skills/rhino-ship-pr/SKILL.md).

Use `gh issue create` or `POST /repos/cameron-nye/rhino/issues` with the agent's
own GitHub credentials. Search open `friction` issues first and comment on a
match. The body states what happened, time lost, how to reproduce, a suggested
fix, whether a product decision is required, and a short preliminary
investigation.

| Label                             | When                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `friction`                        | Durable papercut while working in this fork.                                          |
| `friction` and `friction-skipped` | The repair needs a product decision from Cameron. The body includes a recommendation. |
| `improvement`                     | Polish or a code-quality idea. Not a papercut.                                        |

Do not call `@kentcdodds/friction-log`. Do not open issues on `kody-hq/kody` or
any other Kent repository. Do not post to Discord. If `gh` cannot write, stop.
The upstream daily sweep does not run here.

Agents wait for `✅ Validate` and for the `Cursor Bugbot` check, fix or answer
its findings, resolve those review threads, and push again before expecting
automerge. That wait is part of
[rhino-ship-pr](../../.agents/skills/rhino-ship-pr/SKILL.md).

## Pull requests

Agent pull requests use `cursor/` branches.
`.github/workflows/rhino-automerge.yml` squash-merges them only when
`✅ Validate` (`.github/workflows/validate.yml`) has completed with conclusion
`success` on that head SHA and the Cursor Bugbot gate below is clear.

The workflow runs from `main`. It starts when Validate's `workflow_run`
completes, and when the `check_run` named `Cursor Bugbot` completes. Either
event can arrive first. Each run re-checks every gate. It does not check out the
pull request.

The check name `Cursor Bugbot` is the GitHub check in
[Cursor's Bugbot docs](https://cursor.com/docs/bugbot) (CI check statuses). The
Cursor GitHub App slug on that check is `cursor`. Conclusion `success` or
`neutral` can merge. `success` means Bugbot found nothing unresolved. `neutral`
is the default when Bugbot reports findings, when a newer commit cancelled the
run, or when Bugbot hit an internal error, so unresolved threads are a separate
gate. `failure` does not merge. Bugbot does not emit `skipped`. The separate
`Cursor Bugbot Autofix` check is not a gate.

When Bugbot has not reported a completed check on the head SHA, the job logs
`Skipping: Cursor Bugbot has not reported on <sha>.` and does not merge.
Unresolved review threads are read with GraphQL `reviewThreads`. A thread blocks
the merge when it is unresolved and its first comment author is a Bot whose
login is `cursor`, `cursor[bot]`, or `cursor-bot`. A GraphQL failure logs a skip
and does not merge.

Repository variable `RHINO_REQUIRE_BUGBOT` turns that gate off. Unset, empty, or
any value other than `false`, `0`, `no`, or `off` (any case, surrounding space
ignored) keeps the gate on. Set the variable to `false` when Bugbot is not
installed and merges should follow Validate alone.

It squash-merges only when all of these are also true:

- The Validate run was a `pull_request` event, and the head branch is in this
  repository and starts with `cursor/`. Fork pull requests are ignored.
- That head SHA is still the pull request's current head. The pull request is
  open against `main` and is not a draft.
- The pull request does not have the `no-automerge` label.
- The pull request author login (`user.login`) is exactly `cameron-nye`.
- GitHub reports the pull request mergeable. Merge conflicts leave it open.

### Enable Bugbot

Cameron turns the check on from the Cursor dashboard. The workflow cannot do
that.

1. [Integrations](https://cursor.com/dashboard): GitHub is connected, and the
   installation includes `cameron-nye/rhino`.
2. [Bugbot](https://cursor.com/dashboard/bugbot), under Automations: enable this
   repository from the installations list.
3. On an individual plan, Bugbot reviews pull requests authored by the GitHub
   account linked to that Cursor account. Automerge only merges `cameron-nye`,
   so that login is the one that needs the repository enabled.
4. Leave "Run only when mentioned" off. Each push then publishes
   `Cursor Bugbot`. Agents do not comment `bugbot run`. Bugbot ignores that
   command from a bot or a GitHub App.

A squash merge made with `GITHUB_TOKEN` does not start `push` workflows, and it
does not start the `pull_request: closed` run of `🔎 Preview`.
`🚀 Deploy (production)` (`.github/workflows/deploy.yml`) follows Validate only
for a successful `push` to `main`, so that path does not see an agent merge.
After the squash merge, this workflow dispatches Deploy on `main` with `mode`
set to `production`. It also dispatches `🔎 Preview` on `main` with `action`
`cleanup`, `target` `pr`, and the pull request number. That same Preview
dispatch runs when Actions already squash-merged the pull request. A failed
Preview dispatch warns and leaves the merge in place.

The workflow file has to be on `main` before either trigger runs. A pull request
that changes the gate does not merge itself while it carries `no-automerge`.

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

🧹 Static sets `NODE_OPTIONS=--max-old-space-size=6144`. That raises V8's heap
ceiling for the job (it does not reserve the memory). `ubuntu-latest` has about
7 GB, and the default ~2 GB ceiling kills
`tsc -p packages/worker/tsconfig-start-*.json` with exit 134. The Static job
timeout is 15 minutes. On `ubuntu-latest` the 10-minute cap cancelled
`worker-startup-time:check` before its timeout warning could finish.

🧪 Node's wall-clock ceiling was measured on 4x WarpBuild runners (watch 700s,
hard 840s). On `ubuntu-latest` the same suites passed and still took 794s and
857s, so the 840s ceiling failed the job. When the budget step is passed
`--runner ubuntu-latest`, the Node ceiling is watch 960s / hard 1080s, and the
job timeout is 20 minutes. 4x runners keep 700s / 840s. Workers stay on their 4x
ceiling. The ceiling is not raised by deleting or skipping tests.

`worker-startup-time:check` profiles each production entry with
`wrangler check startup`. Wrangler aborts that profile after 10 seconds, and the
origin profile cannot finish on GitHub's `ubuntu-latest` runner
(`vars.CI_RUNNER`). An exhausted timeout prints a warning and skips the rest of
that worker's samples. It does not fail 🧹 Static or `npm run validate`. A
sample that did finish is still compared with
`tools/worker-startup-budget.json`, and any other profiler error still fails.
Byte budgets and deferred-import checks in `worker-startup-bundles:check` are
unchanged.

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
  Kody"). The email header image is the Rhino logo. The message copy stays.
- OG descriptions, image subtitles, the blog RSS description, the docs-connect
  description in `document-head.ts`, and the Discord image title `Kody Discord`
  / "Join the Kody Discord" (that community is still upstream).
- Agent skill bodies and skill ids in `agent-discovery.ts` (`connect-kody`,
  `what-is-kody`, `kody-cli`) and the MCP prompt in
  `packages/worker/src/mcp/register-prompts.ts`.
- `## Kody Open API` discovery heading (discovery copy still says
  `api.kody.codes`).
- Longer marketing paragraphs on acquisition, feature, and legal pages.
- Marketing scene illustrations stay upstream: greeting, keys, lantern, factory,
  hero, parcels, envelope, and the other koala scenes. Those pages are a later
  pass. The login stage is the Rhino pilot with the jet. Error pages and the
  status favicons use the Rhino pilot. Share cards use that same pilot: the
  agents still, the Discord still, and the blog and guide OG artwork
  (`packages/worker/public/og/kody-base.png`,
  `packages/worker/public/og/kody-discord.png`, and the `*-og.jpg` files). The
  homepage share card still uses the lantern. The brand-guide OG description
  still says "Download the Kody koala mark…" and stays with the other OG
  descriptions.
- README license paragraphs (the Functional Source License names the upstream
  work).
- Outbound MCP client name `{ name: 'Kody' }` and the git-notes author name in
  `packages/worker/src/repo/publish-git-notes.ts`.
- Test fixtures that use `Kody` as sample data rather than product chrome.

## Production hostnames

The app, email, status, API, and Nx cache names are on the zone
`nyneelevenlabs.com` (zone id `b5451c2715afa787ba188025ebf929a0`, account
`fc56d8089384bf6a7806ff0e9a9385a0`). Hosted package apps are on
`nyneelevenlabs.dev` in that same account. The zone id for `.dev` is a GitHub
variable, not a committed value. Workers custom domains issue their own
certificates, so the nested names on `.com` are not limited to Universal SSL's
one label. GitHub Actions variables `APP_BASE_URL`, `USER_EMAIL_DOMAIN`,
`SYSTEM_EMAIL_DOMAIN`, and `PACKAGE_APP_BASE_URL` still override the committed
pins when they are non-empty. Upstream values stay in comments next to the pins.

| Role                 | Name                                                         | Upstream                      |
| -------------------- | ------------------------------------------------------------ | ----------------------------- |
| App (`APP_BASE_URL`) | `https://rhino.nyneelevenlabs.com`                           | `https://kody.codes`          |
| System email         | `rhino.nyneelevenlabs.com` (`kody@rhino.nyneelevenlabs.com`) | `kody.codes`                  |
| User email           | `inbox.rhino.nyneelevenlabs.com`                             | `inbox.kody.codes`            |
| Status               | `https://status.rhino.nyneelevenlabs.com`                    | `https://status.kody.codes`   |
| Open API             | `https://api.rhino.nyneelevenlabs.com`                       | `https://api.kody.codes`      |
| API docs             | `https://api-docs.rhino.nyneelevenlabs.com`                  | `https://api-docs.kody.codes` |
| Nx cache             | `https://nx-cache.rhino.nyneelevenlabs.com`                  | `https://nx-cache.kody.codes` |
| Hosted package apps  | `https://nyneelevenlabs.dev`                                 | `https://kody.run`            |

Hosted package apps use the zone `nyneelevenlabs.dev`, a separate registrable
domain from the app. The zone id is not in this repo. Cameron sets the GitHub
variable below before custom hostnames work. Per-user apps are
`https://{username}.nyneelevenlabs.dev/{leaf}/...`. The apex serves redirects
only (`/` to the app, legacy `/@user/packages/...` to the owning subdomain).
`domains.nyneelevenlabs.dev` is the Cloudflare for SaaS fallback origin and the
CNAME target for a customer hostname.

Production pins `PACKAGE_APP_BASE_URL` to `https://nyneelevenlabs.dev` in
`packages/worker/wrangler.jsonc`. A non-empty Actions variable of the same name
overrides that pin. The deploy writes the pin into the generated main config,
copies it onto the runtime worker, and publishes **zone routes** (not Workers
custom domains) on `kody-runtime`:

- `nyneelevenlabs.dev/*`
- `*.nyneelevenlabs.dev/*`
- `*/*` (SaaS catch-all, this zone only)

Zone routes do not create DNS. Production ensure creates proxied AAAA `100::`
records for `nyneelevenlabs.dev`, `*.nyneelevenlabs.dev`, and
`domains.nyneelevenlabs.dev`. A conflicting A, AAAA, or CNAME at those names
fails the deploy. Universal SSL covers one wildcard label, which is enough for
`{username}.nyneelevenlabs.dev`. A name under `nyneelevenlabs.com` is not a
stand-in: it shares a registrable domain with the app, and the catch-all would
detach every Workers custom domain on that zone.

The runtime wrangler file does not pin `PACKAGE_APP_BASE_URL`. Generate copies
the main worker value, and a second pin would overwrite it. Preview, tests, and
local dev still serve package apps inline. `npm run dev` ignores this apex
because a local server cannot answer on it.

The status worker probes `https://nyneelevenlabs.dev/__runtime/health`. A blank
`PACKAGE_APP_ORIGIN` would stay operational and would not open an incident. This
fork does not leave it blank.

Status alerts go to `csnye86@gmail.com` (`ALERT_EMAIL_TO`). The from-address is
`kody@rhino.nyneelevenlabs.com`. Upstream alerts went to `me@kentcdodds.com`.

Fathom stays off. Upstream's production site id is `WKKSDJGN`. This fork does
not commit it, so the tracker script is not rendered and `trackEvent` no-ops.
Set the `FATHOM_SITE_ID` Actions variable to turn it on. An empty value stays
off.

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

- `deploy-backup-control-plane` always writes
  `deploy_backup_control_plane=false`. Upstream runs the job when
  `DR_DEPLOY_TOKEN` and `DR_BACKUP_ACCOUNT_ID` are both set and would upload to
  Kent's DR account. The wrangler file keeps the worker and bucket names, turns
  the enable gates off, and blanks the source account, drill account, Access
  team, allowed email, manifest key, and `https://kody.codes` origin. The
  workflow no longer hardcodes Kent's production account
  `a99ee2e72728dd52902ef288b7b1447d` or D1
  `8c1014d1-6b41-4695-a0a2-159071f0f919`. Do not set the DR secrets below.
- DR secret escrow (`dr-escrow.yml`) always skips. Upstream seals
  `SECRET_STORE_KEY` into the backup bucket when the escrow passphrase and
  `DR_BACKUP_*` credentials are set.
- Nx cache deploy (`nx-cache-deploy.yml`) skips its steps without
  `NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN`. Production deploy also withholds
  the workflow call when that secret is unset, so it does not ensure the R2
  bucket first.
- Status incident delete skips its steps without `STATUS_INCIDENT_EVENT_SECRET`.

Per-PR preview deploys stay enabled. Preview sweep and audit bump stay
upstream-only. Close-time cleanup is triggered by the automerge workflow via
`workflow_dispatch`. After a squash merge, and when Actions already merged the
pull request, `.github/workflows/rhino-automerge.yml` dispatches `🔎 Preview` on
`main` with `action` `cleanup`, `target` `pr`, and that pull request's number. A
failed dispatch warns and leaves the merge in place. `GITHUB_TOKEN` does not
start the `pull_request: closed` cleanup, which is why the dispatch exists.

### Before a deploy that publishes package apps

Auto-merge dispatches production deploy. Do these before that run. The zone id
is not committed.

GitHub (production environment, or repository variables if that environment does
not override them):

| Name                                    | Kind                | What to set                                                                                    |
| --------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `PACKAGE_APP_ZONE_ID`                   | variable, or secret | Zone id of `nyneelevenlabs.dev` (zone overview). Deploy prefers the secret, then the variable. |
| `PACKAGE_APP_BASE_URL`                  | variable, optional  | Leave unset. The workflow and the wrangler pin both use `https://nyneelevenlabs.dev`.          |
| `CLOUDFLARE_CUSTOM_HOSTNAMES_API_TOKEN` | secret, optional    | **SSL and Certificates: Edit** on `nyneelevenlabs.dev`. Do not reuse `CLOUDFLARE_API_TOKEN`.   |

`PACKAGE_APP_ZONE_ID` is a Worker var for the Custom Hostnames API. Apex and
`{username}` routing look the zone up by name, so package apps on
`{username}.nyneelevenlabs.dev` deploy without the id. Customer custom hostnames
do not: add, sync, and reconcile throw until the id is set. Add the variable
before relying on custom domains.

Cloudflare dashboard, zone `nyneelevenlabs.dev` (same account as
`nyneelevenlabs.com`, account `fc56d8089384bf6a7806ff0e9a9385a0`):

- The zone is Active and on this account. Confirm the deploy token
  `CLOUDFLARE_API_TOKEN` includes this zone, not only `nyneelevenlabs.com`:
  **DNS: Edit** (the ensure step writes the three AAAA records) and **Workers
  Routes: Edit** (the runtime worker publishes the zone route table).
- Do not attach a Workers custom domain anywhere on this zone. Replacing the
  route table detaches it and deletes its DNS record.
- Remove any apex, `*`, or `domains` record that is not a proxied AAAA `100::`.
  Ensure creates those three records and fails on a conflicting type.
- Universal SSL must cover the apex and `*.nyneelevenlabs.dev` before browsers
  can open a per-user app. A certificate that is still pending makes the first
  requests fail even after the worker route exists.
- For customer custom hostnames, enable Cloudflare for SaaS on this zone. The
  fallback origin is `domains.nyneelevenlabs.dev`. Customers CNAME their
  hostname there. First-party `{username}.nyneelevenlabs.dev` apps do not need
  SaaS.

### Before the first production deploy

Dashboard and one-time resources this deploy does not create:

- Vectorize index `kody-capabilities-prod` (384 dimensions, cosine).
- Email Sending verification for `rhino.nyneelevenlabs.com` and
  `inbox.rhino.nyneelevenlabs.com`.
- Email Routing on the zone: MX, the `inbox.rhino` subdomain, and a catch-all on
  that subdomain to the origin Worker. `dmarc@rhino.nyneelevenlabs.com` needs a
  verified destination. Deploy forwards aggregate reports to `csnye86@gmail.com`
  unless `DMARC_REPORT_FORWARD_TO` is set. That Gmail address has to be a
  verified Email Routing destination on this account, or ensure fails (a 403
  from the routing API skips the rule instead). Upstream's default forward
  target is `me@kentcdodds.com`.
- DMARC TXT is written by deploy (`rua=mailto:dmarc@rhino.nyneelevenlabs.com`).
  Email Sending may already have created `_dmarc.rhino.nyneelevenlabs.com` and
  `_dmarc.inbox.rhino.nyneelevenlabs.com` as `v=DMARC1; p=reject;`. Ensure
  updates that single TXT in place: it adds `rua`, keeps extra tags such as `fo`
  or `pct`, and sets `p=reject`. It does not create a second record. Leave those
  TXT records in place.
- Workers Observability destination `sentry-otlp-traces`, then put
  `destinations` back on the production trace blocks. Until then, traces stay in
  the Workers Observability dashboard and are not exported.
- GitHub Actions secrets `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`, from a
  Turnstile widget that allows `rhino.nyneelevenlabs.com`. The production origin
  secret sync copies them onto `kody-production` and fails the job when either
  secret is unset. Production boot throws without them, so every route,
  including `/health`, returns the illustrated 500 page. Upstream does not sync
  these and sets them on the Worker by hand.
- Worker API tokens `CLOUDFLARE_APP_API_TOKEN`, `CLOUDFLARE_RUNTIME_API_TOKEN`,
  and `CLOUDFLARE_STATUS_API_TOKEN`, distinct from `CLOUDFLARE_API_TOKEN`.
  Deploy fails in `require-worker-tokens` when any of them is missing.

`npm run dev` still uses the production Wrangler environment, so the committed
email domains and `PACKAGE_APP_BASE_URL` are visible locally. Local dev ignores
that package-app apex and keeps serving package apps inline. `APP_BASE_URL` is
not committed; local dev keeps using localhost. The production deploy writes
`https://rhino.nyneelevenlabs.com` when that Actions variable is empty, and
`https://nyneelevenlabs.dev` when `PACKAGE_APP_BASE_URL` is empty.

### Fresh Cloudflare account

One production Deploy run can create the worker fleet. Upstream deploys jobs
before origin because origin's `JOBS` binding must name a script that already
exists, and jobs' `HOST` binding names `kody-production`. On an empty account
that cycle fails with Cloudflare error 10143
(`Service binding references Worker which was not found`). The API worker's
`KODY_API` binding fails the same way when origin never starts. Highlight and
the push queue have no binding back to origin, so they uploaded on the first
run.

When no transferred Durable Object class is implemented on origin, platform, or
runtime, the run does this. That includes an empty account and this account,
where `kody-production` and `kody-platform` already exist but never hosted `MCP`
or the other classes Kent's transfer migrations expect.

1. Highlight and the push queue deploy first.
2. Jobs deploys **without** `HOST`, and creates `JobManager` with
   `new_sqlite_classes` instead of `transferred_classes` from `kody-production`.
   Origin does not export `JobManager`, so there is nothing to transfer on this
   account. That upload is a classic `wrangler deploy`.
   `wrangler versions upload` refuses a pending Durable Object migration, which
   is what the first jobs attempt hit before it fell through to
   `wrangler deploy` and then 10143.
3. Origin is not bootstrapped. Seeding `MCP` and the other transferred classes
   on `kody-production` would make the later slim upload fail with Cloudflare
   error 10064, and transferring them off a script that does not implement the
   class fails with error 10074. The origin bootstrap step stays in the workflow
   for an older checkout, and runs only when that checkout emits
   `origin_bootstrap=true`.
4. Platform bootstrap uploads without runtime bindings and creates its classes
   in place: `MCP`, `McpClientHub`, `OAuthPurgeCoordinator`, `UserMeter`,
   `Mailbox`, `RepoSession`, `RepoSessionIndex`, `StripePlanRefresh`, and
   `ExecutionContextSessionV1`. The generator rewrites `transferred_classes` to
   `new_sqlite_classes` on the same tags, including on later steady deploys, so
   the applied tag does not flip back to a transfer. Fresh mode clears the
   split-deploy tag, so this upload is a classic `wrangler deploy`.
5. Runtime deploys next and creates `StorageRunner`, `RunLog`, and
   `PackageRealtimeSession` the same way. It does not transfer
   `PackageServiceInstance`: that class was deleted upstream and is not
   exported. The migration still creates it and deletes it, because wrangler's
   local sqlite map needs the create. Platform then deploys again with the
   runtime bindings restored.
6. Origin's slim deploy binds those classes with `script_name` and uploads no
   Durable Object migrations. `RUNTIME_WORKER` is in that config because
   `kody-runtime` already exists.
7. Jobs deploys again with `HOST` pointed at `kody-production`.
8. The API worker deploys after origin, so `KODY_API` resolves.

The same Durable Object check covers the rest of the fleet. Jobs creates
`JobManager` in place. The push queue and status already create their classes.
Highlight, API, API docs, nx cache, start routing, and the backup control plane
have no Durable Object bindings.

Later deploys keep the in-place `JobManager`, platform, and runtime migrations.
When platform and runtime already own every transferred class and origin owns
none, the run is steady: jobs deploys once with `HOST`, and platform deploys
once before runtime.

Re-run **Deploy** on `main` with `mode` `production` (Actions → Run workflow, or
the auto-merge dispatch after this lands). Nothing has to be deleted first:

- Leave the Email Sending DMARC TXT records. Deploy updates them.
- Leave any workers the first run created. Highlight and the push queue are
  already live. A jobs upload that died on 10143 did not apply a migration.
- Delete `kody-jobs` in the dashboard only if a later attempt says migration tag
  `v1` was already applied with a different definition. There is no job data on
  this account yet. Then re-run Deploy.
- The platform deploy that failed with error 10074 did not apply migration tag
  `v1`. Leave `kody-platform`. Delete it only if a later attempt says tag `v1`
  was already applied as a transfer. `kody-runtime` has not been created yet.

The dashboard list above still applies (Vectorize, Email Routing destination,
worker tokens). Turnstile is the two GitHub Actions secrets in that list. The
failed run already passed the worker-token check.

The API docs healthcheck on the first production run
(`api-docs.rhino.nyneelevenlabs.com`) was not a Universal SSL coverage gap. That
hostname is a Workers custom domain, so Cloudflare issues a certificate for the
name itself. The check saw NXDOMAIN, then TLS handshake failures while the
certificate was issuing, then `/health` 200. The next request, `GET /`, returned
502 until the custom domain finished propagating; a later request to `/`
was 200. `/openapi.json` proxies
`https://api.rhino.nyneelevenlabs.com/openapi.json` and answers 502
`upstream_error` while the API worker is absent. That job was skipped because
origin failed. The next production deploy creates the API worker before API
docs. No certificate product is required.

Origin production vars no longer name Kent's accounts. Stripe price ids
(`price_1UKHxZLAQpAnsYszwwqZTCCT`, `price_1UKHxaLAQpAnsYszlsVHHXjK`), billing
portal `bpc_1UBzc8LAQpAnsYszyBkO2N3F`, YouTube playlist
`PLV5CVI1eNcJhP4nrJt85L7PxHjebFpDfY`, and the disaster-recovery exporter are
unset. This account is `fc56d8089384bf6a7806ff0e9a9385a0`. Upstream's DR account
is `a41d50ecaf0ae0f86dd1824ef6729cb2`, bucket `kody-production-backups`,
manifest key `kody-dr-2026-07`. Unset means billing has no purchasable price,
the playlist allowlist does not fetch, and export, paced backup, and restore
drills stay off. Those lanes run only when the flag is the literal string
`"true"` and S3 credentials exist. Deploy expands `DR_D1_PACED_SOURCES` only
when paced backup is enabled, so Kent's D1 ids are not written.

Personal-use mode also skips the homepage playlist hardcoded as `PLBPBUA8boGLA`.
Set `rhinoPersonalUse` false to restore that fetch with the public site. Fathom
stays off (`WKKSDJGN` is not committed). Status alerts stay at
`csnye86@gmail.com`.

The restore trust files are empty, so the drill CLI does not treat Kent's D1 or
key `kody-dr-2026-07` as approved.

The next production deploy replaces Worker vars. It does not delete Worker
secrets. Delete these if they were copied from Kent. Unset is already safe.

GitHub Actions, repository or the production environment:

| Name                            | Kind     | What to do                                                                                                                                        |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`             | secret   | Delete. Optional origin and platform sync copies it when set. Kent's key plus the old price ids checks out on his Stripe account.                 |
| `STRIPE_WEBHOOK_SECRET`         | secret   | Delete. Same sync.                                                                                                                                |
| `YOUTUBE_DATA_API_KEY`          | secret   | Delete. Optional origin sync. The hero playlist fetch stays off in personal-use mode.                                                             |
| `FATHOM_SITE_ID`                | variable | Leave unset. `WKKSDJGN` is Kent's site.                                                                                                           |
| `KIT_API_KEY`                   | secret   | Delete if it is Kent's Kit key. Signup tagging uses tag id `21252175` when this secret is set. The tag id is a code default, not a GitHub secret. |
| `OAUTH_GITHUB_CLIENT_ID`        | secret   | Delete if the GitHub OAuth app is Kent's. Create a Rhino app before setting a replacement.                                                        |
| `OAUTH_GITHUB_CLIENT_SECRET`    | secret   | Delete with the client id.                                                                                                                        |
| `OAUTH_GOOGLE_CLIENT_ID`        | secret   | Delete if the Google OAuth client is Kent's.                                                                                                      |
| `OAUTH_GOOGLE_CLIENT_SECRET`    | secret   | Delete with the client id.                                                                                                                        |
| `OAUTH_X_CLIENT_ID`             | secret   | Delete if the X app is Kent's.                                                                                                                    |
| `OAUTH_X_CLIENT_SECRET`         | secret   | Delete with the client id.                                                                                                                        |
| `OAUTH_DISCORD_CLIENT_ID`       | secret   | Delete if the Discord app is Kent's.                                                                                                              |
| `OAUTH_DISCORD_CLIENT_SECRET`   | secret   | Delete with the client id.                                                                                                                        |
| `DISCORD_BOT_TOKEN`             | secret   | Delete if it is Kent's bot.                                                                                                                       |
| `DISCORD_GUILD_ID`              | secret   | Delete if it is Kent's guild.                                                                                                                     |
| `DISCORD_MEMBER_ROLE_ID`        | secret   | Delete if copied.                                                                                                                                 |
| `DISCORD_STANDARD_ROLE_ID`      | secret   | Delete if copied.                                                                                                                                 |
| `DISCORD_PRO_ROLE_ID`           | secret   | Delete if copied.                                                                                                                                 |
| `SENTRY_DSN`                    | secret   | Keep only a Rhino project DSN. Delete it if events still land in Kent's Sentry project.                                                           |
| `DR_DEPLOY_TOKEN`               | secret   | Delete. Would deploy the control plane into the account below. The job no longer runs, and the token should not exist.                            |
| `DR_BACKUP_ACCOUNT_ID`          | secret   | Delete. Upstream value is `a41d50ecaf0ae0f86dd1824ef6729cb2`.                                                                                     |
| `DR_BACKUP_BUCKET_NAME`         | secret   | Delete.                                                                                                                                           |
| `DR_BACKUP_ACCESS_KEY_ID`       | secret   | Delete. With the secret key, export would write to that R2 bucket once the lane is enabled.                                                       |
| `DR_BACKUP_SECRET_ACCESS_KEY`   | secret   | Delete.                                                                                                                                           |
| `DR_BACKUP_ADMIN_TOKEN`         | secret   | Delete.                                                                                                                                           |
| `SECRET_ESCROW_PASSPHRASE`      | secret   | Delete. Escrow no longer runs.                                                                                                                    |
| `DR_BACKUP_SOURCE_ACCOUNT_ID`   | variable | Leave unset. Do not set `a99ee2e72728dd52902ef288b7b1447d`.                                                                                       |
| `DR_BACKUP_SOURCE_D1_ALLOWLIST` | variable | Leave unset. Do not set Kent's D1 uuid `8c1014d1-6b41-4695-a0a2-159071f0f919`.                                                                    |

Cloudflare dashboard, account `fc56d8089384bf6a7806ff0e9a9385a0`, Workers
`kody-production` and `kody-platform` (Settings → Variables and Secrets). Delete
the secret if it is present. The next deploy clears the old plain-text vars
(Stripe prices, YouTube playlist, DR account) and does not delete secrets.

| Worker secret                 | Workers                                  |
| ----------------------------- | ---------------------------------------- |
| `STRIPE_SECRET_KEY`           | `kody-production`, `kody-platform`       |
| `STRIPE_WEBHOOK_SECRET`       | `kody-production`, `kody-platform`       |
| `YOUTUBE_DATA_API_KEY`        | `kody-production`                        |
| `KIT_API_KEY`                 | `kody-production`, `kody-platform`       |
| `DR_BACKUP_ACCESS_KEY_ID`     | `kody-production`                        |
| `DR_BACKUP_SECRET_ACCESS_KEY` | `kody-production`                        |
| `DR_BACKUP_ACCOUNT_ID`        | `kody-production`, if stored as a secret |
| `DR_BACKUP_BUCKET_NAME`       | `kody-production`, if stored as a secret |

`kody-production-d1-backups` is not deployed by this fork. Do not delete a
worker of that name in Kent's account. If a copy exists in this account from an
earlier experiment, it is unused while the deploy job stays skipped.

`csnye86@gmail.com` is only the status alert destination and the DMARC forward
target. It is not a Stripe, YouTube, or backup identity. Preview seed data still
uses `me@kentcdodds.com` as a fixture email. That is not an alert path. Product
copy that still names `me@kentcdodds.com` (contact mailto, discovery contact,
testimonial mailto) stays with the other Kody copy.
