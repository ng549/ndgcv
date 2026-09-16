# Inside the Work — redesign preview

Branch from `codex/v3-copy-navigation` (`a7f9507`). **Do not merge. Do not deploy to nicolasgoureau.com until the preview is approved.**

## What this is

The approved visual direction is brand board 2, *Inside the Work*: dark photographic, warm, layered parallax, compact header.

The **working preview** is the Grok Build app (not GitHub Pages). `docs/index.html` on this branch still has the copy/navigation updates from PR #1 and the previous left-rail HTML. The live domain has historically served an older root page; Pages is configured on `docs/`. Those are not interchangeable.

## Locked copy (from the implementation prompt + this branch)

- Headline: “I see possibilities. I like figuring out how to get there.”
- Supporting copy and 30+ years / software sentences as approved.
- Bio with the locked handyman ending. No gearhead / engines line.
- 23 topic descriptions from this branch.
- Company-first career links with dates underneath.
- Software statuses unchanged (planned / designed / prototype / functional / live).

Removed: “I build it myself, end to end,” recruiter availability lines, competency jargon, board slogans.

## Visual system

- Charcoal `#22262B`, warm white `#EFEDE6`, blue `#8FB0D8` for links/selection, gold `#D99A45` rare (name period only).
- Manrope 600 headings/nav, Source Sans 3 body, IBM Plex Mono for dates/numbers.
- Compact sticky header (no left-rail filing cabinet).
- Walk-in parallax on desktop only: far ~0.18, portrait ~0.08, type stable. Off on mobile and `prefers-reduced-motion`.
- Cream contrasting section for What I Work On.
- Authentic portrait, Camping World packaging, and product screenshots. Board retail scenes not presented as his projects.

## Tested in the Grok preview

- Desktop (~1280) and mobile (~390): no horizontal overflow.
- Header current-section state; mobile menu.
- Direct section links and in-page “Let’s talk”.
- Career company chips open the role before scrolling (`#role-campingworld`).
- Topic list (23) reveals the matching description.
- Software galleries (PARKOUR Costs tab and others).
- mailto, tel, LinkedIn.
- Keyboard focus ring; skip link.
- Production build succeeded.

## Missing assets (did not block the preview)

- No authentic photo of Nicolas working with people in the repo (Drive thumbnails are unreliable here; they are not faked).
- Several older career chapter stills (`img-01`…) are not in `docs/` / `public/v3`; those chapters stay text-first.
- Atomiq’s original ChatGPT-export filenames were remapped to the local booth captures already in the repo.

## Deployment blockers

- GitHub Pages still publishes `docs/` from `main`. This branch is preview-only.
- Cloudflare / Workers / nicolasgoureau.com stay on hold.
- The Grok app and the static `docs/index.html` are different runtimes. Shipping this look to the domain requires a follow-up that updates `docs/` (or replaces Pages with the Grok deploy) after approval.
