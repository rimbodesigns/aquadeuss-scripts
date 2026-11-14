# aquadeuss-scripts

Site-wide JavaScript for the Aquadeuss website (Webflow, staging: [staging-aquadeuss.webflow.io](https://staging-aquadeuss.webflow.io/)), migrated from Slater (project 17429) on 2026-11-14.

- `main.js`: everything in one file. One section per page or feature (`adGlobal`, `adHome`, `adGallery`); the router at the bottom decides what runs where.
- `slater/`: the original Slater files, as they were on 2026-11-14. Reference only, not loaded on the site.

| Section | Runs on | Came from |
| --- | --- | --- |
| `horizontalLoop` | shared helper | GSAP seamless loop, was in both GLOBAL.js and HOME.js (identical) |
| `adGlobal` | every page | 48613 GLOBAL.js: logo rotation, parallax, footer parallax, side nav wipe, FAQ accordion, logo wall cycle, button hover, sliders, form validation |
| `adHome` | `/` | 48614 HOME.js: option block hover, draggable hero slider |
| `adGallery` | `/gallery` | 52058 GALERY-test.js: masonry grid |

Tested on 2026-11-14 against the original Slater setup (staging pages served locally with the Slater tags swapped for `main.js`): same ScrollTriggers, slider state, FAQ and masonry layout on `/`, `/gallery` and `/contact`, no errors from `main.js`.

## Switching Webflow over from Slater

In Webflow **Site settings → Custom code → Footer** (or wherever the Slater tags sit; Gallery and Home may have page-level tags too):

1. Remove the Slater tags:
   `https://slater.app/17429/48613.js`, `https://assets.slater.app/slater/17429/48614.js`, `https://assets.slater.app/slater/17429/52058.js`
2. Add one tag, below GSAP and the inline `gsap.registerPlugin(...)`, no `defer`:
   `<script src="https://cdn.jsdelivr.net/gh/rimbodesigns/aquadeuss-scripts@v1.0.0/main.min.js"></script>`
   (jsDelivr builds `main.min.js` from `main.js` automatically)
3. Publish to staging, check Home slider, FAQ, nav menu, gallery masonry, then publish live.

## Known issue: smooth scroll is broken (fix in Webflow)

The site loads `https://cdn.jsdelivr.net/npm/locomotive-scroll@beta/bundled/locomotive-scroll.min.js`. npm no longer has a `beta` tag, so this URL returns 404 and the inline Locomotive Scroll setup throws `LocomotiveScroll is not defined` on every page. Pin the version in the Webflow custom code:

`<script src="https://cdn.jsdelivr.net/npm/locomotive-scroll@5.0.0-beta.21/bundled/locomotive-scroll.min.js"></script>`

Still inline in Webflow: `gsap.registerPlugin(...)`, the Locomotive Scroll setup, and the Cal.com embed.

## Release flow
1. Edit `main.js`, commit, push.
2. `git tag vX.Y.Z` and push the tag.
3. Update the version in the Webflow footer tag.
4. Publish to staging (webflow.io), test, then publish live.

This repository is public (jsDelivr needs that): no passwords, API keys or client data in here.
