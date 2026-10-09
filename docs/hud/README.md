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

Connected records expose exactly two editable fields in their detail panel: `status` and `next action`. A save sends the fixed same-origin `PATCH /api/hud/opportunities/<opp_id>` route with `{ status, nextAction, expectedRevision, actionId }`. The revision is supplied only by the protected GET response and the action ID is retained for an identical retry. The HUD never sends a Sheet ID, range, Drive URL, or another editable field.

The source re-reads a row before and after its limited write. A successful response replaces the rendered records and revisions. On a conflict—or an ambiguous source/network failure—the HUD refreshes the protected record, keeps the local draft visible, and asks the owner to reconcile deliberately. It never claims that an ambiguous save did not change the source. Sample records retain their local-only controls and never show a live Save action.

The HUD renders the optional Sheet link only when it is an HTTPS `docs.google.com/spreadsheets/d/<id>/edit` URL. Unsupported URLs are hidden. The Sheet identifier and URL are never committed to the public bundle.

### Private photo stream

The reserved photo frame requests only the fixed same-origin `/api/hud/photo` endpoint. It sends an owner-gated, no-store JPEG request on load and every 20 seconds; a second in-memory image layer crossfades the returned bytes into view. The browser receives no Drive ID, source URL, or image list, and the repository contains no private image pixels. A missing or unavailable endpoint is shown truthfully in the frame as **Not connected** or **Private source unavailable**.

The image endpoint must remain fixed and owner-gated, return only `image/jpeg` bytes with `Cache-Control: no-store`, and decide image selection server-side. The client rejects redirects, does not send arbitrary source URLs, and does not attempt to pick or retain a photo.

### Private reference contacts

The Contacts & references panel asks only the fixed same-origin `/api/hud/references` endpoint for owner-authorized, read-only reference records. A missing endpoint (`404`) or unavailable private connection (`409`) leaves the local sample cards visible and states that the private source is not connected. A valid `200` response—including `{"references": []}`—replaces those sample cards with the protected source state, so an empty private source is never represented as sample data.

The endpoint returns only `{ references: [...] }`, where every reference has the existing external `referenceId` (for example `REF-001`), `name`, `preferredName`, `workEmail`, `personalEmail`, `phone`, `linkedinUrl`, `sharedCompanies`, `notes`, `introductionDraft`, `headsUpDraft`, and one permission value: `Agreed`, `Ask first`, or `Unavailable`. The HUD creates no persistent contact ID, has no write or send route, and never changes a permission. Contact links require a user action; introduction and heads-up drafts are displayed only as read-only, explicitly unsent text.

## Deliberate limits

- Google Sheets, Drive, photos, email, and calendars are private sources. This release only reads the protected opportunities response and the fixed protected photo stream when those backend routes are available.
- Email and Google/iCloud calendar functions are not connected here.
- Materials and controls outside the protected opportunities response remain fictional sample records. Contacts remain sample-only unless the fixed protected references endpoint returns a valid read-only response. When the protected response is available, only an opportunity's status and next action may be saved; its follow-ups remain view-only.
- In this repository's protected `/hud/` release, the HUD remains a sample experience rather than a private-data workspace. Local static opening has no access control; access is enforced by the deployed Worker.
