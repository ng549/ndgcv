# Factory Test #6 — File Ownership

Root: `/home/factory-user/repos/ndgcv-factory-test-06` (branch `integration/factory-test-06-command-center`)

| Owner | Files |
|---|---|
| Orchestrator | `reports/factory-test-06/**`, `.github/workflows/worker13-command-center-check.yml`, `README.md`, `WORKER-13-HANDOFF.json`, final integration |
| Worker A (contract integration) | `src/capability.mjs`, `src/adapter.mjs`, `schemas/orchestrator-command.contract.json`, `schemas/orchestrator-worker-state.contract.json`, `schemas/operator-view.contract.json`, `tests/capability.test.mjs` |
| Worker B (command center) | `src/core.mjs`, `src/ui.mjs`, `src/index.mjs`, DELETE `src/worker9-index.mjs`, `wrangler.jsonc`, `package.json`, `tests/core.test.mjs`, `tests/ui.test.mjs` |
| Worker C (tests/adversarial) | `fixtures/**`, `tests/adapter.test.mjs`, `tests/integration.test.mjs`, `tests/worker9-auth-proposal.test.mjs`, `handoff/**` |
| Worker D (ownership auditor, later) | read-only; writes `reports/factory-test-06/OWNERSHIP-AUDIT.md` |

All paths above are relative to `nexus-v2/operator-command-center/` except `.github/...`.

Verification: after workers return, `git status --porcelain --untracked-files=all` must show
changes only in owned paths; anything else is an ownership violation and is reverted.
