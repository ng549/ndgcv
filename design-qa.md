# Inside the Work preview — design QA

final result: passed

Scope: reviewable public CV frontend. Cloudflare account deployment and private reference approval/email automation are not complete and are not represented as working features.

## Evidence
- Source visual truth: `/workspace/scratch/7737b44dd817/generated_images/exec-6c382cf8-7d88-4b5c-b3e4-28fecef9f96d.png` (1536 × 1024).
- Browser-rendered final: `/workspace/scratch/cv-desktop-final-v2.jpg` (1363 × 936, desktop page, top, menu closed).
- Full comparison: `/workspace/scratch/cv-qa-comparison.jpg`.
- Focused typography/header comparison: `/workspace/scratch/cv-qa-focus.jpg`.
- Source normalized proportionally to implementation width; no device chrome. Reference is a composed mockup, so lower crop differs after adding requested availability text and retaining full bio. Implementation uses original photographic cutout, not the generated portrait in the source.
- Mobile evidence: `/workspace/scratch/cv-mobile-review.jpg`, real page in 390 × 844 iframe. This is a responsive CSS layout check, not physical-device testing.

## Findings and iteration
- Initial P2: hero occupied 850px and introduction delayed the biography. Reduced hero to 740px, placed bio directly below it, moved introduction after bio. Final screenshot confirms cream bio starts in first desktop viewport.
- Initial P2: header links sat at the far right, unlike source. Changed to start-aligned compact navigation after wordmark. Final focused comparison confirms correction.
- Initial P2: mobile illustration competed with headline. Increased mobile dark overlay. Mobile menu and gallery tests passed.
- No remaining actionable P0/P1/P2 issues in reviewed states. Full bio is intentionally longer than the mockup excerpt; actual fabric-sourcing illustration replaces invented clothing props. Availability text and image caption add height versus source. These preserve user corrections and source facts.

## Fidelity surfaces
- Typography: Manrope headings/navigation, Source Sans 3 prose, readable hierarchy and three-line opening. Font rendering visible in browser; no clipping in reviewed states.
- Spacing: stable text layer, original portrait on right, paired illustration/bio, grouped results and career stories. Responsive stacking used below 760px.
- Colors: charcoal #22262B, warm white #EFEDE6, blue #8FB0D8; source amber retained in editorial imagery.
- Images: seven source-based editorial illustrations, original unretouched photographic portrait cutout. Software screenshots and original packaging evidence remain readable. No broken loaded images in browser; every image path verified on disk.
- Copy: approved opening, childhood work at twelve, locked handyman bio, Atlanta GA, remote/hybrid and travel. Eight career roles, 32 story passages, 23 topics, seven software projects and three smaller projects retained. Source project status labels preserved rather than inferred current claims.

## Interaction checks
- Desktop section navigation and company links; Camping World link opens its disclosure.
- Mobile menu opens, links navigate and close menu.
- PARKOUR Costs gallery button changes selected state and screenshot.
- Reference-request disclosure reveals labeled form. Button clearly prepares an email, not an unimplemented API submission. No test emails sent.
- Email, telephone and LinkedIn destinations checked in rendered DOM.
- Reduced motion and mobile disable parallax in code; native disclosures preserve keyboard behavior.
- Desktop DOM overflow: false. Loaded broken image list: empty.
- Browser console checked: only browser-extension metadata errors; no site JavaScript errors.
- npm build/test, static image and anchor checks, and Wrangler deployment dry-run pass.

## Follow-up
- Review on Nicolas's actual mobile device and gather copy notes.
- Connect Cloudflare account and deploy preview; do not change production domain before review.
- Implement authenticated private reference list, approval dashboard and email delivery after secure sender connection.
- Original product packaging remains photographic source evidence; extend illustration treatment if Nicolas wants that evidence stylized too.
