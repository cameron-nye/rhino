# Rhino ECP signing and trust (self-host)

Rhino forks Kody's execution-context protocol with an additional pinned trust
root, `root-rhino-1`, so a self-hosted deployment can publish its own
root-signed `/v1/execution-contexts/server-keys` document without using the
upstream production private key and without disabling verification.

## Production ceremony (current)

- Root kid: `root-rhino-1` (public `x` pinned in `ecpRootPublicKeys`)
- Frame kid: `ecp-frame-rhino-2026-11` with `notAfter` 1857254400000
- Committed envelope:
  `packages/worker/src/execution-contexts/server-keys.production.json` (`k/p/s`
  only)
- Frame private material: GitHub Actions secret `ECP_FRAME_SIGNING_KEYS`, synced
  to `kody-platform` only
- Root private material: offline vault on the operator machine (never in git)

## Adding `root-rhino-1` globally (honest implications)

This fork **adds** `root-rhino-1` alongside upstream `root-1` / `root-2`.
Rhino-built CLI trusts keysets signed by any pinned root on any API host. The
protocol has **no** production rootâ†”domain binding; only `root-test-1` is
host-gated via `KODY_ECP_TRUST_TEST_ROOT` for `*.workers.dev` / `localhost`.
Stock `@kodycodes/cli` without this pin rejects Rhino-signed keysets
(fail-closed).

## Lifecycle

1. Root signs key-set documents (prefix `kody-ecp-keys/1`).
2. Frame keys in `ECP_FRAME_SIGNING_KEYS` sign WebSocket frames; first unexpired
   entry signs.
3. `serverKeySetDocument` serves the test keyset only when every configured
   frame kid is a test kid; otherwise the committed production document.

## What is not supported

- No config-only custom root on stock CLI
- No `KODY_ECP_TRUST_TEST_ROOT` bypass for custom domains
- No verification skip flags
- Do not reuse upstream production private keys
