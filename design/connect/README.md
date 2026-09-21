# Illustrated connect page — preview implementation

Approved in conversation: skateshop illustration style; a background and header; Nicolas’s actual CV portrait centered with softened edges and name below; icons surrounding him on desktop, a mobile grid; hover explanations; future icons supported. “Ok go” authorizes implementation and review, not production deployment.

## Source and assets

- Base: main `73f2a2e127ff685b978e1c4b779d8c9d60f3df61`; branch `cv/connect-illustrated-preview`.
- Existing portrait: `docs/assets/img-00-tight.png`, unchanged; CSS masks feather its outer edges.
- Existing approved skateshop/background: `docs/illustrations/43.webp`, visually inspected and reused with a restrained overlay.
- Six illustrated icon masters in this folder; optimized transparent WebP derivatives in `docs/assets/connect/`. Built-in image generation used; alpha channels verified. Each icon is a separate generated asset. Prompts are in `image-prompts.json`.
- Shared action data and renderers: `scripts/connect.mjs`; responsive styling: `scripts/connect.css`; tooltip Escape behavior: `scripts/connect.js`.
- Add an action with a unique ID, label, destination, hint and matching image; no per-icon coordinates required. Five initial actions; three shared controls in Section 20. Additional items flow into the grid.

## Run and review

`npm run build && npm test`, then `npm run dev -- --port 4173`.
Open `/connect` and `/#contact` on the local server. Workers static asset default HTML handling serves `connect.html` at `/connect`; deployment configuration was not changed.
`node scripts/export-connect-preview.mjs` exports a self-contained contact-page HTML preview with embedded images, CSS, script and vCard. Its homepage links open the existing public Interactive CV.

## Verified

- Build and test suite pass. Packaged assets, IDs and local anchors resolve.
- Entire career section is byte-for-byte identical to the base: 8 roles, 32 tabs, 12 company examples. Education differs only in the two approved heading strings; AUP plaque asset preserved.
- All six build stages remain. Three featured blocks, seven-project showcase and three mini examples removed from public HTML; archive contains original data and local assets.
- Local HTTP `/connect`, `/connect.html`, `/`, vCard and an icon return 200 with appropriate content types.
- Exact published email, LinkedIn destination, reference-request subject and vCard fields asserted. No reference identities published.
- Eight-action markup generation succeeds from the same action registry. Visual layout with additional icons is unverified.
- QR PNG/SVG generated using Python qrcode with Q correction and four-module quiet zone. OpenCV decoded the exact destination at digital samples representing 25 and 30 mm at 300 dpi. `qr-verification.json` contains results. Reproduce with `python scripts/generate-connect-qr.py` (requires qrcode and opencv-python-headless).

## Outstanding before release

- Desktop/mobile visual inspection, actual hover/keyboard behavior, focus and contrast checks, mobile vCard import and cross-device downloads. Cloud Browser cannot open local server/file previews in this environment; no browser QA claim is made.
- Layout after adding more icons requires browser inspection despite markup and responsive rules being implemented.
- Production `/connect` route and physical phone scanning at printed size. Do not release QR on a CV until these pass.
- No production deployment; no merge to main; no complete two-page CV or copilot implementation.

Future PDF uses one QR only, labelled “Explore my work & connect.” Make the QR a clickable link to `https://nicolasgoureau.com/connect`, retain readable clickable email and website, and do not repeat a QR on its destination page.

## Latest icon/card revision

Current CV artwork is `cv-v2-master.png` / `cv-v2.webp`; LinkedIn uses full wordmark `linkedin-v2-master.png` / `linkedin-v2.webp`. The signpost control is removed. Section 20 now has Email me and LinkedIn only. The vCard adds the LinkedIn URL with a grouped LinkedIn label. Five public contact fields only; native device import remains unverified. All eight image masters, including superseded versions, are preserved in Drive; see `drive-images.json` for exact IDs.
