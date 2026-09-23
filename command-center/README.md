# CV Job Search Command Center

First implementation, 23 September 2026. NOT DEPLOYED. Not ready for customers.

## Scope and location

Private job-search hub with opportunities, contacts/references, correspondence log, next actions, filters, document links, interview notes, offer notes, export and dashboard change history. Google Sheets is the record store; Drive contains documents. No D1 database. This directory is isolated from the public Interactive CV build and from Nexus. Do not merge or deploy it as part of the public CV assets.

The customer is selected from the verified Cloudflare Access JWT email and server-side workspace registry. Request parameters cannot select another customer's sheet or token. This is a foundation for multiple isolated workspaces, not completed SaaS onboarding.

## Run and check

`npm ci` then `npm run build`, `npm test`, `npm run check`.

`npm run dev` starts an explicit local-only preview on 127.0.0.1:4177 with test records in /tmp/cv-command-preview.json. This harness bypasses Access only in this separate local entrypoint. It is not imported by the production Worker. Do not expose or deploy it. Never enter real mailbox credentials in the preview.

## Deployment prerequisites

Deploy as its own private Cloudflare Worker, not ndgcv. The production configuration runs authentication before every asset/API request and disables workers.dev routing. Configure a dedicated Access-protected hostname. Verify anonymous access, expired sessions and direct-origin access before enabling real records.

Required server-side configuration:
- ACCESS_TEAM_DOMAIN: HTTPS Cloudflare Access team domain.
- ACCESS_AUD: dedicated application audience.
- WORKSPACES_JSON: secret JSON array of `{id,email,name,sheetId}`. Use the verified login email, which may differ from a customer's mailbox sender.
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: application OAuth configuration.
- GOOGLE_CONNECTIONS_JSON: secret object keyed by workspace ID, containing that customer's refreshToken. Never put tokens in Sheets, source control, browser storage or logs.
- SHEETS_WRITE_ENABLED: defaults false. Keep false until the concurrency release gate below passes.

The ChatGPT Drive connection used to create the workbook does NOT grant this deployed app runtime access. Product OAuth consent, token lifecycle, disconnect/revoke, and automatic provisioning still need implementation and live verification. Environment-secret registry is a first-workspace bootstrap, not the finished customer credential vault.

## Sheet contract

Use the headers in schema.mjs without renaming them. Each record has a stable unique Record ID. Adding records directly in Sheets currently requires an ID such as opp-001 or contact-001; automatic ID assignment is pending. Blank rows are ignored. Dates are native date values. The connector validates rows and detects invalid/duplicate IDs and malformed headers. Supported working capacity is 4,999 records per tab; capacity expansion needs corresponding range and UI review.

Dashboard reads pull the current Sheet. Writes compare row fingerprints, validate fields and write an activity entry in the same Google batch as the change. Text is written as stringValue, not formulas. Direct Sheet edits use Google Sheets version history; they are not falsely labeled as captured dashboard events.

### Concurrency release gate

Google Sheets has no compare-and-set primitive in this implementation. A human may edit/sort a row between the final read and API write. Fingerprint checks detect pre-existing changes but do not close that race. Dashboard writes are therefore disabled by default. Before enabling production writes, implement and verify a conflict-safe write model (for example protected canonical tabs with an editable change-request tab and a serialized processor). Preserve the user's requirement to control records from Sheets. Do not claim real-time or conflict-free two-way sync until verified. Also add request idempotency before enabling retries; current code deliberately never retries writes automatically.

## Email and analysis

No mailbox is connected and no sending endpoint exists. Correspondence is a manual record/draft workflow. The UI says so. No messages have been sent. No AI analysis service is connected.

iCloud supports IMAP and SMTP. A custom integration must verify Apple authorization eligibility or use an app-specific password. Never request the primary Apple password. A private mail service needs encrypted credentials, per-customer connections, IMAP UIDVALIDITY/UID checkpoints, bounded message retrieval, safe plain-text rendering, attachment controls, and verified Sent-folder behavior. SMTP retries after an ambiguous response must not silently resend.

Sending must require approval of the exact recipients, subject, body and attachment version. Editing any of those invalidates approval. A Sheet status change does not approve sending. Analysis of inbound content must treat email as untrusted data; it cannot trigger sending or release reference contacts.

## Verification recorded

- Ten automated tests initially passed: fail-closed auth/assets, signed identity workspace selection, invalid/expired tokens, CSRF rejection, missing sending endpoint, input validation, follow-up filtering, stale edit rejection, Sheet ID checks, per-workspace token scoping, write gate.
- JavaScript syntax checks passed.
- Native control workbook imported and read back; five tabs, three native tables, status dropdowns and private owner-only permissions verified via connector.
- Local browser installation failed (download was invalid), so rendered app/mobile interaction QA is NOT verified.
- Live Access login, Google OAuth, actual backend-to-Sheets reads/writes, mailbox connection, email sending, analysis, customer signup, automated provisioning, billing, deletion/revocation and production deployment are NOT complete.

## Product roadmap approved in conversation

Nicolas is the first customer. Target onboarding is two short screens: create account/profile, then connect tools. Tools can be connected later. Drive/Sheets are optional for future customers, but required for Nicolas's current workspace. Account settings replace hard-coded identity, branding and job-search preferences. Support employment, consulting and consulting-to-leadership. Future integrations: iCloud first for Nicolas, then Google and Microsoft. Self-service signup, credential vault, billing/entitlements and data deletion/export must pass acceptance before sale. Do not advertise universal two-click setup because provider authorization may add steps.

## Sources checked

- https://support.apple.com/en-la/102525
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Existing CV Copilot requirements and REFERENCE-WORKFLOW.md on ng549/ndgcv main.
