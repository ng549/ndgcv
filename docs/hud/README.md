# Career HUD sample preview

This bundle is an owner-protected, sample-data Career HUD release. It contains no private career records, credentials, email, calendar, Google Sheets, Drive, photo, or reference data.

## Open locally

Open `hud/index.html` in a modern browser, keeping the sibling `assets/` folder in place. The interface stores changes only in memory for the current browser session; it does not send, sync, or persist anything.

## Protected runtime connection

The HUD asks the same-origin `/api/hud/opportunities` endpoint for owner-authorized career records and an optional runtime-only Sheet link. That endpoint remains behind the owner-only `/api/hud/*` gate. A missing endpoint (`404`) or unavailable private connection (`409`) shows **Not connected**; an invalid response or server failure shows **Private source is unavailable**. The public bundle stores no Drive, Sheet, or planning URL.

The endpoint must return a no-store JSON object shaped like:

```js
{
  values: [
    ['opportunity_id', 'company', 'title', 'status', 'next_action'],
    ['opp_runtime_id', 'Company name', 'Role title', 'research', 'A real next step']
  ],
  today: [
    { id: 'followup_runtime_id', opportunityId: 'opp_runtime_id', title: 'A real next step', detail: 'Company name — Role title' }
  ],
  revisions: { opp_runtime_id: 'a backend revision hash' },
  links: {
    careerSheetUrl: '<runtime-only HTTPS docs.google.com spreadsheet edit URL>'
  }
}
```

The HUD shows connected records read-only. It renders the optional Sheet link only when it is an HTTPS `docs.google.com/spreadsheets/d/<id>/edit` URL. Unsupported URLs are hidden. The Sheet identifier and URL are never committed to the public bundle.

## Deliberate limits

- Google Sheets, Drive, photos, email, and calendars are private sources. This release only reads the protected opportunities response when that backend is available.
- Email and Google/iCloud calendar functions are not connected here.
- Contacts, materials, and controls outside the protected opportunities response remain fictional sample records. When the protected response is available, its opportunities and follow-ups are rendered read-only.
- In this repository's protected `/hud/` release, the HUD remains a sample experience rather than a private-data workspace. Local static opening has no access control; access is enforced by the deployed Worker.
