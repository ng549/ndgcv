# ndgcv

Personal CV site for Nicolas Goureau — dual-view + **uniform interactive role stories**.

## Views

- **Interactive** (default): each role opens as a story — Situation → Move → Result → Insight, with filmstrip + stage frame.
- **Simple**: compact timeline. Toggle in the header (`localStorage`).

## Stories

All roles share one interaction model (`stories.js` + `app.js`):

1. Click a role card to expand (only one open at a time).
2. Use chapter tabs, filmstrip thumbs, or Prev/Next to move through four beats.
3. The stage image and caption change with the chapter.

| File | Role |
|---|---|
| `index.html` | Shell |
| `styles.css` | Layout + story UI |
| `stories.js` | Role data + chapter copy + image paths |
| `app.js` | View toggle + story engine |

## Story images

Place web-optimized JPGs here (referenced in `stories.js`):

```
assets/stories/empty-box.jpg      # vacant big-box (Big Box / FitBox)
assets/stories/shared-desk.jpg    # shared reception / BOX model
assets/stories/systems-desk.jpg   # tools / data / ops
assets/stories/boutique.jpg       # specialty / private label
assets/stories/merch-wall.jpg     # merchandising / aftermarket
```

If an image is missing, the stage falls back to a gradient frame — the story still works.

## Local

Open `index.html` or serve the folder. Add the `assets/stories/` images for full visuals.

## GitHub Pages

Settings → Pages → Deploy from `main` / root.
