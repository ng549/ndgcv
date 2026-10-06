# Section 14 capability diagram QA — 2026-09-18

Source visual truth: ../generated_images/exec-3d8be544-d3e0-41dc-8eb7-5ada10028a4a.png (1536×1024).
Implementation screenshot: ../section14-preview.png (1363×936 browser viewport, 1× density). Local browser: http://terminal.local:4173/#capabilities.
State: invitation, plus Sourcing detail, keyboard focus, close, and all 23 selected panels.

Comparison: source and rendered capture were opened together. Source has a wider canvas; compare the diagram content at proportional width, not exact full-page pixel positions. Existing sidebar, section label and heading alignment are retained intentionally. Diagram uses four new concept sketches, four original groups, rounded controls, navy/amber background, clear center and handwritten invitation. Lower controls extend below the 936px viewport and remain in normal scrolling flow. No page overflow.

Iteration 1: P2 hard rectangular image edges and excessive vertical spacing. Fixed with a soft elliptical edge mask, 195px desktop image height and tighter row spacing. Moved group headings beneath their images as in the reference. Post-fix screenshot confirms softened edges, readable controls, clear central panel and no overlap.

Required fidelity surfaces: Manrope headings and Source Sans 3 controls/body preserve site typography; Caveat gives the invitation its sketch style. Four corner groups preserve spacing around the central panel. Cream panel with dark navy text and amber active control remains legible over the decorative background. New concept images retain proportions and full subjects. All 23 capability names preserved, each with an introduction and three substantive bullets. Concepts identified through accessible image text and hover title, with full-size links. No central name, image footer or reused site illustrations.

Interaction verification: clicked all 23 controls; each revealed exactly one panel with three bullets. Tab from Sourcing opened Private Label; Escape restored the invitation and focus; Close also works. Active dot is attached to selected pill. All four foreground images loaded. Browser error review found extension metadata errors only, no site-script errors. Existing npm checker still mistakes the script URL for an image; independent check confirmed every actual img source exists. HTML outside Capabilities/head is byte-for-byte unchanged, preserving eight jobs, 32 tabs, 12 supporting examples and Section13.

Mobile visual check: PENDING. Browser capabilities list is empty, so no viewport resizing available. Responsive CSS is implemented but this report does not claim mobile visual verification.

Final result applies to available desktop comparison and interactions; mobile remains an explicit verification gap.

final result: passed

Live follow-up: c300e22 initially omitted the stylesheet-only background from the deployment package (P1). Fixed by a51a3bd, explicitly packaging the asset. Post-fix actual live screenshot ../section14-live.png shows background, four new sketches, Sourcing cream panel, readable bullets and adjacent active dot. All23 live panels tested; Tab and Escape passed; eight jobs and32tabs present. Build163assets. Live desktop final result remains passed; mobile visual remains pending.

## User correction pass — 2026-09-18
User screenshot showed excessive negative space, rejected pills, and background restricted to diagram. Updated to immersive skateshop-style studio behind entire section, compact groups and underlined text controls. User supplied screenshot and rendered local correction inspected. Narrowed central panel after initial comparison showed it covering edge of neighboring labels. Real pointer movement verifies open → enter panel (stays open) → leave (closes). Entire HTML content unchanged; mobile remains unverified. Prior style acceptance superseded by this correction. Desktop correction final result: passed.

## Career HUD preview QA — 2026-10-06

Source visual truth: user-attached approved `nicolas-hud-soft-workbench-v4.png` (version 3), inspected directly in this conversation at 1488×1059. The reference establishes the navy rail, slate retail-photo header, ochre controls, warm stone panels, dark readable body copy, shallow flat-3D depth, and Tuesday sample-state layout.

Implementation: `docs/hud/index.html`, `docs/hud/hud.css`, and `docs/hud/hud.js`, packaged as `/hud/`. The UI uses the reused retail photograph at `docs/hud/assets/storefront.webp` so the document, script, stylesheet, and photo remain under the same future protected route; the supplied HUD image is not embedded as the interface. All displayed records are clearly labeled sample-only, held in browser memory, and make no network calls.

Desktop capture: `design/career-hud/hud-desktop-qa.png` at the matched 1488×1059 viewport, 1× density. The 279px navigation rail, 278px header, 103px week strip, warm two-column content layout, gold review action, date treatment, active Tuesday card, and working-note panel align to the reference’s main geometry. A first capture exposed an oversized preview notice and overlapping timeline markers; both were corrected before this capture. The static preview server was also fixed to resolve directory routes such as `/hud/` to their `index.html` instead of returning 404.

Mobile capture: `design/career-hud/hud-mobile-qa.png` at 390×844, 1× density. The rail becomes a compact horizontally scrollable top navigation; the hero, week strip, schedule controls, and sample-only state remain readable with stable controls. Decorative navigation icons from the mockup are intentionally omitted rather than replaced with drawn or text-glyph icons; this is a P3 visual difference only.

Interaction verification in local Chromium: Today/Career navigation passed; search/filter-ready opportunity list passed; add opportunity opened and closed correctly, increased the sample list from three to four records, and selected the new detail; complete/reopen next step passed; Escape cancelled the dialog; keyboard focus reached navigation; duplicate-action protection is present through `runOnce`; and no browser script errors were recorded. Reduced-motion emulation reduced the photo transition to `0.00001s`; parallax affects only the background photo.

Build and regression verification: `npm run build` passed (182 public assets) and `npm test` passed, including HUD packaging, real photo-asset inclusion, sample-only disclosure, no-fetch check, and reduced-motion coverage. The preview was inspected in executor-local Chromium because this session has no cloud-browser connector; no cross-executor or public preview URL is claimed.

final result: passed

## Homepage private-workspace entry QA — 2026-10-06

Implementation: the generated homepage navigation now includes an icon-only gold workspace mark linking to `/hud/`. It has the explicit accessible label `Open private workspace`, a native title, and a hover/focus tooltip. The small design feature remains deliberate but unobtrusive; it does not claim or provide security by obscurity. The navigation script closes the compact menu for both same-page and route-changing links.

Desktop capture: `design/career-hud/home-navbar-desktop-qa.png`, 1440×1000 at 1× density. The 44px icon sits beneath Apps in the existing left navigation rail and preserves the rail’s spacing, dark surface, and gold accent language without becoming a visible menu item.

Mobile capture: `design/career-hud/home-navbar-mobile-qa.png`, 390×844 at 1× density. The compact Menu opens to a scrollable navigation sheet. The icon-only private-workspace route retains its 44px touch target and does not cover the menu control.

Interaction verification in executor-local Chromium: the icon has no visible text; its computed accessible label is present; keyboard focus reveals the tooltip without increasing the rail’s horizontal scroll width; Enter navigates to `/hud/`; and the mobile open navigation sheet includes the 44px target. `npm run build` and `npm test` passed after the addition. This is a local visual check only; it does not claim a public deployment or an authentication check.

final result: passed
