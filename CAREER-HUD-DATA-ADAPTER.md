# Career HUD data adapter contract

This is a repository-independent contract for a future, owner-authenticated Career HUD backend. The current `/hud/` implementation uses unrelated in-memory sample state only. This contract has no Google, Drive, or network implementation and must never place personal records in this repository.

The executable reference is [career-hud/sample-adapter.mjs](career-hud/sample-adapter.mjs); its tests are [scripts/check-hud-data-contract.mjs](scripts/check-hud-data-contract.mjs).

## Stable records

| Entity | Immutable ID pattern | Required relationship fields |
| --- | --- | --- |
| Company | `company_<opaque>` | — |
| Opportunity | `opp_<opaque>` | optional `companyId` once a private Companies record exists |
| Contact | `contact_<opaque>` | optional `companyId`, optional external `referenceId` |
| Task | `task_<opaque>` | optional `opportunityId`, optional `contactId` |
| Document | `document_<opaque>` | optional `opportunityId`, optional `companyId` |
| Activity | `activity_<opaque>` | exactly one of `opportunityId`, `contactId`, or `taskId` |

`<opaque>` is an application-generated 8–128 character identifier containing only letters, numbers, `_`, and `-`. It is immutable. Spreadsheet row numbers, names, domains, or Drive URLs are never identifiers. Existing reference-sheet values such as `REF-###` remain external `referenceId` values; they do not replace a HUD contact ID.

Every saved record has adapter-managed `kind`, `revision`, `createdAt`, `updatedAt`, and `archivedAt`. An archive is a reversible state change, never a delete; restore preserves the original immutable ID. New mutations require a distinct `action_<opaque>` idempotency key. Repeating the same key and identical command returns the original saved record without repeating the write; reuse with another command is rejected.

## Adapter surface

```js
const result = adapter.create('opportunity', input, { actionId });
const result = adapter.update('opportunity', id, patch, {
  actionId,
  expectedRevision,
});
const result = adapter.archive('opportunity', id, { actionId, expectedRevision });
const result = adapter.restore('opportunity', id, { actionId, expectedRevision });

// { record, replayed } — `replayed` is true only for an idempotent retry.
const active = adapter.list('opportunity');
const includingArchived = adapter.list('opportunity', { includeArchived: true });
```

Create/update relationship IDs must point to an active record of the correct kind. A parent with active dependent records cannot be archived, preventing orphaned records. `expectedRevision` is mandatory for an update, archive, or restore; a stale caller receives a revision conflict instead of silently overwriting newer data. Callers must reload and make an intentional retry with a new action ID.

## Planned Google Sheets and Drive mapping

Google Sheets is the planned store for structured records; Drive is only for document metadata and file IDs. The private adapter will:

- keep the application-owned ID and revision columns in Sheets;
- use explicit columns rather than row positions;
- use Drive file IDs only in the private backend—not public URLs or frontend git;
- escape string cells beginning (even after whitespace) with `=`, `+`, `-`, or `@` before writing them, so user text is not interpreted as a Sheet formula; and
- persist action IDs and their canonical outcome in a private operation log to make retried writes idempotent.

No Sheet, Drive file, permission, or record is created, read, moved, or granted by this preview work.

### Opportunities sheet: agreed read contract

The smallest first connection is a **private, read-only** Opportunities adapter. It accepts a private backend-provided `fetchValues` dependency and a known spreadsheet ID, validates rows, and returns an active opportunity snapshot. It has no Google SDK, browser fetch, OAuth, or credential code; `/hud/` remains sample-only until a private backend is connected.

The live sheet uses these exact headers in `Opportunities!A:X`:

```text
opportunity_id, company, title, official_url, location, work_arrangement,
salary_min, salary_max, salary_currency, salary_basis, total_comp_min,
total_comp_max, compensation_notes, fit_rationale, gaps, status,
discovered_date, verified_date, next_action, notes, source_evidence,
posting_status, application_status, schema_version
```

`opportunity_id` uses the immutable `opp_<opaque>` format. `company` is the current display text; the v1 reader explicitly returns no `companyId` rather than deriving one from that text. `title` is the canonical Sheet field and is mapped to the existing HUD display field `role`. `schema_version` is the literal `v1`. Dates are stored as typed Sheets DATE cells and the private reader converts unformatted numeric serials to ISO `YYYY-MM-DD` with UTC arithmetic; it never parses locale display strings such as `10/6/2026`. Unknown numeric compensation values stay blank; active research leads use `status=research_lead` and `application_status=not_applied`.

This A:X/v1 sheet is deliberately **read-only**. It has no stable `company_id`, record `revision`, or `archived_at` fields, so it cannot safely support the adapter's company relationship, expected-revision update, or archive/restore operations yet. Add those fields only as a versioned future schema (`v2`), not by silently treating names, row numbers, or timestamps as IDs/revisions. The reference implementation is [career-hud/google-sheets-opportunities-reader.mjs](career-hud/google-sheets-opportunities-reader.mjs), with mock-only tests in [scripts/check-hud-sheets-reader.mjs](scripts/check-hud-sheets-reader.mjs).

To connect it later, the private backend needs only: the resulting spreadsheet ID in runtime configuration, a service identity authorized to read that one private sheet, and a `fetchValues({ spreadsheetId, range })` implementation that returns `values`. No public Sheet, browser credentials, write scope, or frontend secret is needed for this first read path.

## Sheets compare-and-set limitation

Google Sheets does not provide a transactional compare-and-set conditional on a row revision. `expectedRevision` protects a future adapter-controlled write path, but a human edit between read and write can still race that check. The first connected implementation must **not** claim strong CAS.

The proposed manual-edit policy is: reload the target row immediately before a write, compare its immutable ID and revision, write the next revision only after that check, then re-read to verify; on any mismatch or verification failure, surface a manual-edit conflict and require an explicit reload/retry. For higher assurance, temporarily lock the integration-owned tables to the private service account and use a separate reviewed intake area for human edits. This proposal is documented only—nothing is connected or configured here.
