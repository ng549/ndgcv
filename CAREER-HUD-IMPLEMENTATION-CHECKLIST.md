# Career HUD implementation and test checklist

## Gate before implementation

- [ ] Materialize and visually inspect the approved `nicolas-hud-soft-workbench-v4.png` Library file, version 3, in this executor.
- [ ] Record the target viewport dimensions, layout measurements, palette, type treatment, image use, and desktop/mobile states from the actual pixels.
- [ ] Keep the approved mockup as a QA reference only; build the interface from semantic HTML, CSS, JavaScript, and separately sourced image assets.

## Public-preview scope

- [ ] Add a static, sample-data-only `/hud/` entrypoint and include it in `scripts/package.mjs`'s public allowlist.
- [ ] Keep the existing CV, Apps, Scout, and Apps Worker routes unchanged.
- [ ] Add a clearly labeled preview notice: local in-memory sample state only; Google Sheets, Drive, email, calendar, and reference sync are not connected.
- [ ] Do not add private routes, credentials, production auth, storage bindings, or real personal records to the public repository.

## Functional journey

- [ ] Implement navigation for Today, opportunities, contacts/references, materials, and direction without adding crowded future-integration tabs.
- [ ] Support opportunity list/detail, status and target-company filtering, search, and back/cancel paths.
- [ ] Support in-memory add, edit, and complete actions with duplicate-click protection and clear success/state feedback.
- [ ] Provide coherent sample opportunities, recruiter relationships, fit notes, priorities, material versions, and direction—not private data.
- [ ] Mark unsupported email, calendar, Drive, Sheets, sending, and sync actions as disabled/not connected; never imply they succeeded.

## Data boundary

- [ ] Define a repository-independent adapter contract for companies, opportunities, contacts, tasks, documents, and activity.
- [ ] Use stable IDs such as `company_*`, `opportunity_*`, `contact_*`, `task_*`, `document_*`, and `activity_*` in sample state.
- [ ] Reserve Google Sheets for structured records and Drive for files in the adapter documentation only; do not create, move, or read personal records.

## Accessibility, responsiveness, and motion

- [ ] Use Manrope headings and Source Sans 3 body text, with the approved rail/header/panel/control hierarchy established from the reference image.
- [ ] Make the desktop rail usable with keyboard focus and build a clear iPhone layout with stable controls.
- [ ] Add background-only parallax; respect `prefers-reduced-motion` and leave interaction controls fixed.
- [ ] Verify landmark structure, visible focus, labels, dialog semantics, Escape/cancel behavior, and non-color status cues.

## Verification

- [ ] Start from a full checkout (the current sparse checkout omits assets/archives required by existing build checks), then run `npm ci`, `npm run build`, and `npm test`.
- [ ] Run the local static preview and verify the HUD route in a browser; a successful HTTP response alone is not sufficient.
- [ ] Exercise keyboard navigation, filtering/search, add/edit/complete, duplicate clicks, cancel/back, and disabled integration controls.
- [ ] Capture matched desktop and iPhone screenshots, compare them to the approved reference, and save `design-qa.md` with a pass/fail result.
- [ ] Repeat screenshot and interaction checks with reduced motion enabled; record browser-unavailable checks as blocked rather than passed.
