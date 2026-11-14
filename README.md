# aquadeuss-scripts

Site-wide JavaScript for the Aquadeuss website (Webflow, staging: [staging-aquadeuss.webflow.io](https://staging-aquadeuss.webflow.io/)), migrated from Slater (project 17429) on 2026-11-14.

- `main.js`: everything in one file. One section per page or feature (`adGlobal`, `adHome`, `adGallery`); the router at the bottom decides what runs where.
- `slater/`: the original Slater files, as they were on 2026-11-14. Reference only, not loaded on the site.

| Section | Runs on | Came from |
| --- | --- | --- |
| `horizontalLoop` | shared helper | GSAP seamless loop, was in both GLOBAL.js and HOME.js (identical) |
| `adGlobal` | every page | 48613 GLOBAL.js: logo rotation, parallax, footer parallax, side nav wipe, FAQ accordion, logo wall cycle, button hover, sliders, form validation; plus the service-card hover (was home only) |
| `adHome` | `/` | 48614 HOME.js: draggable hero slider |
| `adGallery` | `/gallery` | 52058 GALERY-test.js: masonry grid |

Tested on 2026-11-14 against the original Slater setup (staging pages served locally with the Slater tags swapped for `main.js`): same ScrollTriggers, slider state, FAQ and masonry layout on `/`, `/gallery` and `/contact`, no errors from `main.js`.

## Changes

- **v1.1.0**: visitors with *reduce motion* on get no endless spins and no parallax (the footer code also skips smooth scroll for them); the logo timer only runs when `#LOGO_ICON` exists and pauses in background tabs; the service-card hover works on every page with the cards, on devices with a real hover; invalid ease `"ease"` written as the `power1.out` GSAP was already using.
- **v1.0.0**: straight port from Slater.

## Webflow custom code (current)

Site settings → Custom code. **Head:**

```html
<!-- Sharper font rendering -->
<style>
  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>

<!-- Faster first connection to jsDelivr (scripts + CSS below) -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>

<!-- LOCOMOTIVE SCROLL CSS: same version as the script in the footer -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/locomotive-scroll@5.0.0-beta.21/bundled/locomotive-scroll.css">
```

**Footer:**

```html
<!-- GLOBAL JAVASCRIPT: github.com/rimbodesigns/aquadeuss-scripts -->
<script src="https://cdn.jsdelivr.net/gh/rimbodesigns/aquadeuss-scripts@v1.1.0/main.min.js"></script>

<!-- LOCOMOTIVE SCROLL: smooth scrolling, pinned version -->
<script src="https://cdn.jsdelivr.net/npm/locomotive-scroll@5.0.0-beta.21/bundled/locomotive-scroll.min.js"></script>
<script>
  // One instance (options: https://scroll.locomotive.ca/docs#/options).
  // Visitors who ask their device for less motion keep normal scrolling.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.locomotiveScroll = new LocomotiveScroll({
      lenisOptions: {
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      },
    });
  }
</script>
```

Page-level custom code: none (Home and Gallery had the Slater page tags; removed 2026-11-14).

## Switching Webflow over from Slater (done 2026-11-14)

In Webflow **Site settings → Custom code → Footer** (or wherever the Slater tags sit; Gallery and Home may have page-level tags too):

1. Remove the Slater tags:
   `https://slater.app/17429/48613.js`, `https://assets.slater.app/slater/17429/48614.js`, `https://assets.slater.app/slater/17429/52058.js`
2. Add one tag, below GSAP and the inline `gsap.registerPlugin(...)`, no `defer`:
   `<script src="https://cdn.jsdelivr.net/gh/rimbodesigns/aquadeuss-scripts@v1.0.0/main.min.js"></script>`
   (jsDelivr builds `main.min.js` from `main.js` automatically)
3. Publish to staging, check Home slider, FAQ, nav menu, gallery masonry, then publish live.

## Fixed 2026-11-14: smooth scroll was broken

The site loads `https://cdn.jsdelivr.net/npm/locomotive-scroll@beta/bundled/locomotive-scroll.min.js`. npm no longer has a `beta` tag, so this URL returns 404 and the inline Locomotive Scroll setup throws `LocomotiveScroll is not defined` on every page. Pin the version in the Webflow custom code:

`<script src="https://cdn.jsdelivr.net/npm/locomotive-scroll@5.0.0-beta.21/bundled/locomotive-scroll.min.js"></script>`

Still inline in Webflow: `gsap.registerPlugin(...)`, the Locomotive Scroll setup, and the Cal.com embed.

## Release flow
1. Edit `main.js`, commit, push.
2. `git tag vX.Y.Z` and push the tag.
3. Update the version in the Webflow footer tag.
4. Publish to staging (webflow.io), test, then publish live.

This repository is public (jsDelivr needs that): no passwords, API keys or client data in here.
