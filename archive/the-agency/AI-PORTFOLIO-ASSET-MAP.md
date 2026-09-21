# AI Portfolio Asset Map

## Google Drive Master Archive

Root:

`CV Assets / AI Portfolio`

URL:

`https://drive.google.com/drive/folders/1hbhc2q3CzXxtz4GJpByKbAHcROq6NisP`

### Project Screens

Folder:

`https://drive.google.com/drive/folders/1DY8vbYlFpkiiNWmE6TnKHdUkYVMyq-Yn`

Files currently archived:

- `ATOMIK-01-CONSOLE-INTELLIGENCE.jpg`
- `BROKER-TERMINAL-01-POSITION-HOME.png`
- `EDUK8-01-HOME-IOS.png`
- `FOUNDRY-01-AGENT-ECOSYSTEM-OVERVIEW.png`
- `NG-CV-01-PROFILE-HERO.png`
- `PARKOUR-01-CONTROL-TOWER-DASHBOARD.png`
- `PARKOUR-02-GRAND-CENTRAL-EXCHANGE.png`
- `PARKOUR-03-AI-COST-INTELLIGENCE.png`
- `PARKOUR-04-COMMUNICATIONS-CONSOLE.png`
- `PARKOUR-05-INTEGRATIONS.png`
- `UNIT-POS-01-REGISTER-IPAD.png`
- `VIDEO-PIPELINE-01-STAGE-MAP.png`
- `XDJ-MIXER-01-FULL-BOARD.png`
- `XDJ-MIXER-02-DECKS-SAMPLER.png`

### Tool Logos

Folder:

`https://drive.google.com/drive/folders/1aqeR6cRwJ5GG1IgvfvkQg4xjRzagm4JA`

This folder is the master archive for official/current vendor logo assets.

Required logo inventory is defined in `TOOL-LOGO-MANIFEST.md`.

### Source Handoffs

Folder:

`https://drive.google.com/drive/folders/12dXN3RErCkOk4t1HoRvo96oZwzd_Xlsm`

Contains:

- `DESIGN-PORTFOLIO-INVENTORY.md`

Future design exports, original source screenshots, research handoffs, and non-web-optimized masters should be stored here or in the appropriate sibling folder.

---

# GitHub Website Asset Targets

Canonical repo:

`ng549/ndgcv`

Final web-ready assets should be committed under:

```text
assets/
  ai-portfolio/
    screens/
    tool-logos/
    diagrams/
```

Google Drive is the master archive. GitHub should contain only the final optimized files referenced by the public website.

Do not hotlink the public site directly to private Google Drive files.

---

# Recommended Project-to-Asset Mapping

## PARKOUR

Primary:

`PARKOUR-01-CONTROL-TOWER-DASHBOARD.png`

Secondary:

- `PARKOUR-02-GRAND-CENTRAL-EXCHANGE.png`
- `PARKOUR-03-AI-COST-INTELLIGENCE.png`
- `PARKOUR-04-COMMUNICATIONS-CONSOLE.png`
- `PARKOUR-05-INTEGRATIONS.png`

## ATOMIK

Primary:

`ATOMIK-01-CONSOLE-INTELLIGENCE.jpg`

Supporting origin / functional proof:

- `XDJ-MIXER-01-FULL-BOARD.png`
- `XDJ-MIXER-02-DECKS-SAMPLER.png`

## Merchant PRO

No dedicated Claude Design screenshot was included in the August 24 handoff.

Do not fabricate a Merchant PRO UI image. Use a strong text/system architecture treatment until a real visual is added.

## Video Production Pipeline

`VIDEO-PIPELINE-01-STAGE-MAP.png`

## FLOOR/DESK Broker Terminal

`BROKER-TERMINAL-01-POSITION-HOME.png`

## UNIT Point of Sale

`UNIT-POS-01-REGISTER-IPAD.png`

## EDU K8 DJ Pro

`EDUK8-01-HOME-IOS.png`

## Foundry

`FOUNDRY-01-AGENT-ECOSYSTEM-OVERVIEW.png`

## Existing CV reference

`NG-CV-01-PROFILE-HERO.png`

Use only as historical/reference material unless it improves the redesign.

---

# Asset Handling Rules

1. Preserve original screenshots in Drive.
2. Crop/compress web derivatives only after the layout is chosen.
3. Keep aspect ratio unless the crop is an intentional editorial crop.
4. Never stretch UI screenshots.
5. Prefer AVIF/WebP for final large raster screenshots when browser compatibility is acceptable; retain PNG/JPG masters in Drive.
6. Store authentic SVG vendor logos unchanged when permitted.
7. If a product has no standalone official mark, use the approved parent-brand mark plus text rather than inventing a logo.
8. Keep filenames descriptive and stable so design references survive later implementation changes.
9. All public website images need meaningful alt text.
10. No secrets, private credentials, API keys, tokens, or private internal URLs may appear inside screenshots committed to the public repo.