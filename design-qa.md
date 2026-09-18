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
