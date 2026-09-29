# Nexus mobile command — first implementation

Status: **PREVIEW IMPLEMENTED / LOCAL CHECKS PASSED / LIVE INTEGRATION PENDING**. No live sign-in, Factory connection, deployment, or iPhone installation yet. This is a native Expo/React Native foundation with an explicit opt-in preview, not a browser wrapper around Factory.

## Verification — 2026-09-23

- TypeScript `tsc --noEmit`: passed.
- Expo lint: passed on retry after its automatic ESLint install completed.
- Approval policy: 6 tests passed (isolation, stale/expired/changed scope, idempotency, elevated action denial, SDK outcome mapping, dispatch replay).
- `expo export --platform ios --platform web`: passed; iOS Hermes and web JavaScript bundles exported. This is not a signed native binary build.
- `expo install --check`: dependencies reported up to date. npm emitted a transitive optional worklets peer warning; native build verification must resolve any actual incompatibility before distribution.
- Browser interaction/visual verification: blocked. No browser executable was installed; Playwright's download returned an invalid/truncated archive. No screenshot or successful UI-interaction test is claimed.
- Live integration, CI, physical iPhone, push and production: not verified. Template app icons are placeholders, not approved Nexus/Devil Up branding.

## Run

Node 22.13 or newer. From this directory:

```sh
npm ci
npm start
npm run typecheck
npm test
```

Use an SDK 57-compatible Expo development environment. Signed device/TestFlight distribution still requires the owner's Apple/Expo account configuration; no remote build or paid service has been started. Web export is a UI verification surface only, not proof of iOS device behavior.

## Implemented scope

- Agency, Work, Approvals, and Devil Up tabs with work details.
- Preview instruction composer creates a DRAFT; it does not launch a worker or equate a sentence with an approved Work Packet.
- One in-memory approval record shared between the global inbox and packet detail.
- An explicit disconnected default; preview is opt-in, marked on every screen, never sent to Factory, and cleared on restart/exit.
- Server-side pure decision policy for project/packet/execution/action scoping, actor grants, expiry, version checks, idempotency, rejection, one-action approval, and dispatch consumption.
- Provider permissions and Agency acceptance/review are different record kinds. Neither grants merge or deployment authority.

`server/` is a contract prototype, not an authenticated or persistent service. It must not be imported into the mobile client as an authorization mechanism. The preview deliberately does not pretend to enforce production policy.

## Existing implementation inspected

- `ng549/ndgcv@nexus-v2` canonical at `d55e79356103a519a735b6718bfafe5c334f6dde`, dated 2026-09-23.
- Drive canonical `1N80_JSAO5k02yDcqJp5SPJd2Nwc1MkSY0Gdyb2sSIL8`: body still ends with Sept 21 checkpoint; machine canonical carries Sept 23 reconciliation and links its companion doc.
- `integration/factory-test-06-command-center`: Worker 13 `operator-view.contract.json`, adapter and README. Do not replace this contract or merge its branch implicitly. Worker controls are not interactive permission approvals.
- `ng549/agency-build-stack@main`: `src/providers/factory/factory-adapter.mjs` (blob `58ba4b3887b09997c8931bec0b7931cf66593eed`) uses `droid exec`; `src/packets/work-packet.mjs` (blob `b05b57a08885fbe645fed36285f5f96ededcd9d9`) owns packet/review state.

## Reuse decision / sources (2026-09-23)

- Expo SDK 57 / React Native, selected as a reversible implementation choice for the phone surface. Generated official blank TypeScript template, Expo Router navigation. Pinned versions in package-lock.json; Expo and React Native use MIT licenses. No copied V1 app or competing business backend. Expo-specific modules remain replaceable; EAS account services are optional, subject to account terms.
  https://docs.expo.dev/versions/v57.0.0/
  https://docs.expo.dev/router/installation/
- Factory SDK: npm metadata reports `@factory/droid-sdk` 0.9.1, Apache-2.0. Official docs describe `createSession`, `resumeSession`, `session.stream`, and async `permissionHandler`. A handler must return an offered outcome; only ProceedOnce/Cancel fit this initial scope. These are documented capabilities, not live verification in this branch. Library licensing does not establish Factory service resale rights.
  https://docs.factory.ai/sdk/typescript
- Reuse Agency packet, identity, credential, event, and cost services. The new work is the native operator surface and mobile approval contract; no provider keys belong in app bundles, prompts, or push payloads.

## Integration work still required

1. Reconcile the mobile API contract with Build Stack owners and Control Tower. Preserve Worker 13 status/cost truth semantics. Do not expose unauthenticated Worker 9 directly.
2. Add real operator sign-in using an Agency-approved native redirect / PKCE flow, short-lived sessions, revocation, and platform secure storage. Cloudflare browser cookies are not automatically a native URLSession/fetch login. No service token or vault bootstrap secret on the phone.
3. Implement a server-side Factory SDK session adapter with persistent packet↔execution↔session association. Existing web chats are not assumed discoverable: SDK `listSessions()` reads local session storage.
4. Store instruction drafts/approvals durably in Agency Postgres with project grants; create a Work Packet only after scope, acceptance criteria, branch, canonical SHA and budget validation. No silent provider fallback.
5. Persist approval decisions via version compare-and-swap plus event/outbox transaction; bind a digest of the complete pending tool action. The action summary must be redacted and faithful. On timeout, disconnect, unknown outcome, stale execution, or server restart: fail closed and reconcile; never blindly replay an execution.
6. Bind async permission handler to the exact pending request. Only return a current offered outcome after server-side policy and durable decision. Pure policy functions here do not provide cross-process atomicity by themselves.
7. Add authenticated read models for active jobs, transcripts, evidence, CI and costs. Approval acknowledgement is not execution success. Completion still requires Agency review.
8. Add minimal push notifications containing opaque record IDs only; opening a notification must authenticate and re-fetch current state. Do not approve from notification payloads/offline cache.
9. Integration-test a disposable branch through instruction → scoped tool approval → push → PR → CI with no merge; then device-test foreground/background, reconnect, accessibility and TestFlight.

No changes to the public CV, production deployments, or shared worker branches. Factory evaluation is finished; the remaining checks are integration acceptance, not Test #7.
