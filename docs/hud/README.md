# Career HUD sample preview

This bundle is an owner-protected, sample-data Career HUD release. It contains no private career records, personal photos, credentials, email, calendar, Google Sheets, Drive, or reference data.

## Local preview

Open `hud/index.html` in a modern browser. The interface keeps its sample changes and manual location label only in the current browser session. It does not send, sync, or persist anything.

The date is taken from the device clock. Location permission is requested only after the user selects **Use this device**; a manual label is available instead. There is no weather provider, so the HUD always says that weather is unavailable rather than showing invented weather.

## Private-photo and sync contract

`index.html` declares `/api/hud/connections` as the private runtime endpoint. The HUD requests it only with same-origin credentials; `/api/hud/*` is already owner-gated and no-store at the Worker boundary. While that endpoint is absent it returns `404`, which the UI renders as **Not connected**. A `5xx`, invalid response, or unavailable connection renders the separate **error** state.

The backend may alternatively inject the same object as `window.__CAREER_HUD_PRIVATE_MEDIA__` before `hud.js` runs:

```js
{
  sync: {
    state: 'loading' | 'fresh' | 'stale' | 'error',
    lastSuccessfulAt: '2026-10-07T12:34:56.000Z' // only when real
  },
  photos: [
    { id: 'opaque-id', src: 'https://protected.example/photo', alt: 'Optional private description' }
  ],
  links: {
    driveHome: '<runtime-only HTTPS Drive URL>',
    modulePlanning: '/private/planning'
  }
}
```

The authenticated backend, not the public repository, must validate access and return short-lived protected image URLs. The UI uses the actual sync state supplied by that backend; it does not derive a success timestamp. Runtime links are rendered only when they pass a narrow allowlist: an HTTPS `drive.google.com` link for Drive home and a same-origin path for the planning module. No Drive, Sheet, or planning URL is committed to the static bundle. With two or more authorized slides it randomizes a 20-second crossfade and does not repeat the currently visible image. Reduced-motion settings disable automatic crossfades.

## Deliberate limits

- Google Sheets, Drive, email, calendars, photo access, and reference sync are future private sources, not connected here.
- All contacts, companies, opportunities, materials, and actions are fictional sample records.
- No Google Sheet URL, Drive URL, personal-photo URL, credential, or private record belongs in this repository.
- In this repository's protected `/hud/` release, the HUD remains a sample experience rather than a private-data workspace. Local static opening has no access control; access is enforced by the deployed Worker.
