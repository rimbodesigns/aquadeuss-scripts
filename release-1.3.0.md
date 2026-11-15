# Release v1.3.0 (audit package P1)

What changes on the site, what to paste where, and how to check it. Background: audit of 2026-11-15, section 6, package P1.

**When.** After the three running Designer sessions are done and the first publish (audit CODE-01) has put v1.2.0 live and it has been checked. Not while P4 or P6 is editing the Global Styles component.

**Steps 1 to 4 go out in one publish.** The FAQ buttons, the orbit spin, the card hover and the white logo/MENU need the new CSS (step 3) and main.js v1.3.0 (step 2) together. You can paste the CSS in the Designer early, but it must go live in the same publish as the `@v1.3.0` footer. Publishing is site-wide, so if another package publishes while only the CSS is in, the CSS goes live with v1.2.0, and the card hover runs about twice as slow (v1.2.0's GSAP hover then runs through the new CSS transitions) until v1.3.0 ships. Step 5 (lazy calendar) and step 6 (`data-reveal`) are optional and come later, with package P2.

**The new Global Styles embed stays as long as main.js is v1.3.0 or later.** Without it the rings stand still, the cards lose their hover, the logo stays dark over dark sections, and the FAQ questions go back to mouse-only (main.js then logs `FAQ: css/global.css embed not found`). Package P6 trims the Global Styles embeds (CODE-17): it must keep this one.

---

## 0. Before tagging: confirm the hero slider click (audit CODE-15)

v1.3.0 changes what a click on a Home hero slide does on desktop. Check the old behaviour first, on staging as it is now (v1.0.0 and v1.2.0 behave the same), in a desktop browser window 1366 px or wider. Not narrower: at 1280 px only a thin strip of the right-hand slide shows and the fixed "Book a call" button covers most of it, so a click there hits the button and the check looks broken.

- [ ] Click the slide to the right of the active (centred) one: nothing happens.
- [ ] Click the slide to the left of the active one: the slider jumps back two slides, not one (watch the 01/05 counter).

If that is what you see, go on with step 1. If a click already goes to the clicked slide, stop and tell Claude before tagging: v1.3.0 would then change something that works.

## 1. Merge and tag (repo)

jsDelivr serves the file from the git tag, so the tag must exist before Webflow points to it. The work branch is also called `v1.3.0`; delete it after merging, so the name only means the tag (otherwise git calls `v1.3.0` ambiguous, and jsDelivr could pick the branch).

```sh
git checkout main
git merge v1.3.0
git push origin main
git branch -d v1.3.0
git push origin --delete v1.3.0
git tag v1.3.0
git push origin refs/tags/v1.3.0
```

Check that `https://cdn.jsdelivr.net/gh/rimbodesigns/aquadeuss-scripts@v1.3.0/main.min.js` opens, starts with "Minified by jsDelivr" and "Original file: /gh/rimbodesigns/aquadeuss-scripts@1.3.0/main.js", and contains `--ad-faq-buttons` (Ctrl+F / Cmd+F; that name only exists from v1.3.0 on). The minified file has no header comment: jsDelivr's minifier removes it.

## 2. Site settings → Custom code → Footer

Replace the whole Footer field with this. Changes from v1.2.0: the tag says `@v1.3.0`, and Locomotive gets three options (audit CODE-04 step 2): it runs on GSAP's ticker and hands every scroll straight to ScrollTrigger, so smooth scrolling and the scroll effects share one animation loop with no one-frame lag.

```html
<!-- GLOBAL JAVASCRIPT: github.com/rimbodesigns/aquadeuss-scripts -->
<script src="https://cdn.jsdelivr.net/gh/rimbodesigns/aquadeuss-scripts@v1.3.0/main.min.js"></script>

<!-- LOCOMOTIVE SCROLL: smooth scrolling, pinned version -->
<script src="https://cdn.jsdelivr.net/npm/locomotive-scroll@5.0.0-beta.21/bundled/locomotive-scroll.min.js"></script>
<script>
  // One instance (options: https://scroll.locomotive.ca/docs#/options).
  // Visitors who ask their device for less motion keep normal scrolling.
  // Runs on the GSAP ticker and feeds ScrollTrigger directly: one animation loop, no lag.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.locomotiveScroll = new LocomotiveScroll({
      lenisOptions: {
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      },
      scrollCallback: ScrollTrigger.update,
      initCustomTicker: (render) => gsap.ticker.add(render),
      destroyCustomTicker: (render) => gsap.ticker.remove(render),
    });
  }
</script>
```

Keep `window.locomotiveScroll = ...`: main.js v1.3.0 uses it to stop the page scrolling behind the open menu (with reduce motion there is no Locomotive, and main.js stops the page itself).

## 3. Global Styles component: one new Code Embed

Add a Code Embed inside the Global Styles component, after the existing embeds, and paste this block. It is `css/global.css` without the comments (1.4 KB). Paste this block, never the file itself: the commented file is the source in the repo, so change it first if anything here needs to change, then copy the change into this block.

```html
<style>
@keyframes ad-spin{to{transform:rotate(360deg)}}
[rotate360]{animation:ad-spin var(--spin-duration,12s) linear infinite}
@media (prefers-reduced-motion:reduce){[rotate360]{animation:none}}
.option_block{transition:transform .3s ease,border-color .3s ease}
.option_block .tag.dark{transition:background-color .3s ease}
@media (hover:hover){.option_block:hover{transform:scale(1.03);border-color:var(--aqua-deuss-turquase--turquoise,#048f93)}
.option_block:hover .tag.dark{background-color:var(--aqua-deuss-turquase--turquoise,#048f93)}}
.nav_menu .header .logo_img,.nav_menu .header .menu-button{transition:filter .35s ease}
.nav_menu .header.is-on-dark .logo_img,.nav_menu .header.is-on-dark .menu-button{filter:brightness(0) invert(1)}
[data-cal-lazy]{width:100%;min-height:530px;overflow:auto}
@media (max-width:767px){[data-cal-lazy]{min-height:1000px}}
html{scrollbar-gutter:stable}
:root{--ad-faq-buttons:1}
.accordion-css__btn{display:block;width:100%;margin:0;padding:0;border:0;border-radius:0;background:none;-webkit-appearance:none;appearance:none;font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;text-align:left;cursor:pointer}
.accordion-css__btn:focus-visible{outline:.125rem solid #4d65ff;outline-offset:.25rem}
.accordion-css__item-bottom>*{visibility:hidden;transition:visibility 0s .6s}
[data-accordion-status="active"] .accordion-css__item-bottom>*{visibility:visible;transition-delay:0s}
</style>
```

What each line is for:

| Rule | Why |
| --- | --- |
| `ad-spin`, `[rotate360]` | Home orbit rings spin in CSS (was GSAP every frame, even off screen); none with reduce motion. 12 s per turn; a number on the attribute (`rotate360="20"`) still sets other seconds per turn, as before (main.js passes it on as `--spin-duration`) |
| `.option_block` | Service card hover: scale 1.03, turquoise border and tag, hover devices only (was GSAP) |
| `.nav_menu .header ...` | White logo/MENU over `[data-nav-theme="dark"]` and with the menu open (main.js v1.2.0 injected this itself) |
| `[data-cal-lazy]` | Space for the lazy calendar of step 5; does nothing until then |
| `html{scrollbar-gutter:stable}` | main.js stops Locomotive while the menu is open, which hides the scrollbar; this stops the page shifting sideways on Windows |
| `:root{--ad-faq-buttons:1}` | Tells main.js this CSS is there. Without it main.js leaves the FAQ questions as they were, instead of showing grey browser buttons |
| `.accordion-css__btn` | FAQ questions are buttons now; this makes them look exactly like the old heading text, with the site's focus ring |
| `.accordion-css__item-bottom>*` | A closed FAQ answer is hidden from screen readers and Tab too (it was only squeezed to 0 px, so VoiceOver read every closed answer); it disappears after the 0.6 s close animation |

Later renames and clean-up (package P6): keep this embed (see the top of this file). If `.option_block`, `.tag.dark` or the `Turquase` variables are renamed, update this embed and `css/global.css`; main.js no longer uses those names. If `.accordion-css__item-bottom` is renamed, update the embed, `css/global.css` and `initAccordionCSS` in main.js. main.js also reads `--aqua-deuss-bleu--dark-bleu` and `--background-colors--dim_turqyase` for the MENU colours, with the old hex as fallback, so a rename there only needs the two names in `initSideNavigationWipeEffect` updated.

## 4. Site settings → Custom code → Head

Replace the whole Head field with this. New: the two font preloads (audit LH-12 step 1) and the theme colour (audit CODE-17 step 1).

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

<!-- Fonts: start downloading straight away instead of after the CSS (Faxi headings, RM Mono body) -->
<link rel="preload" href="https://cdn.prod.website-files.com/68f137c6f3b99c00b202f574/68f140896f02f4d4b3b94f67_Faxi-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="https://cdn.prod.website-files.com/68f137c6f3b99c00b202f574/68f1407898fd042a39f09b45_rmmono-regular.woff2" as="font" type="font/woff2" crossorigin>

<!-- Browser bar colour on phones: AQUA DEUSS dark bleu -->
<meta name="theme-color" content="#001A54">

<!-- LOCOMOTIVE SCROLL CSS: same version as the script in the footer -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/locomotive-scroll@5.0.0-beta.21/bundled/locomotive-scroll.css">
```

- The font URLs are the ones in the published site CSS on 2026-11-15 (both return `font/woff2` with CORS). If a font is ever uploaded again, its URL changes: copy the new one from the site CSS `@font-face`.
- In the Global Styles component, embed `rimbo_basics`: delete the line `<meta name="theme-color" content="#"/>` ("#" is not a colour; the head line above replaces it).

## 5. Optional, with package P2: lazy Cal.com calendar (audit CODE-02)

**Only after v1.3.0 is live.** With this markup the calendar is loaded by main.js; with v1.2.0 it would never appear.

The calendar (about 1.8 MB, 85 requests) then loads when the visitor scrolls within 800 px of it, not when the page opens. Replace the whole content of the BOOK A CALL embed (`2caacd24-2edc-1892-36e7-9250dd3d2a8a`) and of Contact's calendar embed (`5a8fdac9-35a7-c844-7fe3-b57c0e6e41c9`, or the shared copy once CODE-10 has merged them) with:

```html
<!-- Cal.com inline calendar: main.js (v1.3.0+) loads it once the visitor scrolls near it -->
<div id="my-cal-inline-15-min-call" data-cal-lazy data-cal-link="frank-deuss-wbj4yz/15-min-call" data-cal-namespace="15-min-call" data-cal-layout="month_view"></div>
```

- `data-cal-link`, `data-cal-namespace` and `data-cal-layout` are the values from today's snippet (`calLink`, the `"15-min-call"` namespace, `"layout":"month_view"`). main.js runs Cal.com's own loader, `init`, `inline` and `ui` calls with them, unchanged.
- The space before the calendar arrives comes from the `[data-cal-lazy]` rule in step 3: at least 530 px (1000 px on phones). Measured heights: 534-570 px on desktop, about 2,100 px on a phone, where Cal.com lists every time slot. The minimums are lower on purpose, so no empty gap is left after loading; the rest grows while the calendar is still off screen.
- The fixed "Book a call" button still opens cal.com directly, so visitors without JavaScript can book.

## 6. Optional, with package P2: replace the 3 slide-in interactions (audit CODE-09)

When deleting the "slide in from bottom" interactions in the Designer, add the custom attribute `data-reveal` (no value) to the element that had it:

- BOOK A CALL: the `cal-com` embed (`2caacd24-2edc-1892-36e7-9250dd3d2a8a`)
- Contact: the calendar embed (`5a8fdac9-35a7-c844-7fe3-b57c0e6e41c9`)

**Not** to Contact's `layout207_component`: it holds the page's main photo and should simply show. main.js plays the same motion (from 100 px lower and transparent, 1 s, ease out) once, when the element scrolls into view; reduce motion and a failed script both leave it visible. Check in the page source that the inline `style="opacity:0"` is gone from these elements.

---

## Test checklist (staging, after the publish)

Use a desktop browser at 1280 px or wider, with the console open, plus a phone (or the browser's phone mode).

**Basics**
- [ ] Page source: `@v1.3.0/main.min.js`, the two font preloads and `theme-color` `#001A54` in the head, one `<style>` with `ad-spin`, no `theme-color" content="#"`.
- [ ] Console stays clean for 10 s on `/`, `/gallery`, `/contact`, `/partners`, `/about-us`, `/for-architects`, `/blog`, and a made-up URL (404 page: v1.2.0 threw `Cannot read properties of null (reading 'getAttribute')` there).
- [ ] DevTools Network, fonts: `Faxi-Regular.woff2` and `rmmono-regular.woff2` start at the top of the waterfall and are each downloaded once.

**Scroll and motion**
- [ ] Smooth scrolling feels as before; parallax blocks and the footer reveal still move.
- [ ] Home: the orbit rings spin.
- [ ] With Reduce motion on (macOS: System Settings → Accessibility → Display → Reduce motion; iPhone: Settings → Accessibility → Motion), reload Home: rings stand still, no parallax, normal (not smooth) scrolling, the Technologies slider does not autoplay, and MENU opens and closes at once, without the wipe; the page behind the open menu still does not scroll (mouse wheel, or a swipe on the phone). Partners (once the logo wall is visible again): the logos stay put.
- [ ] Logo and MENU turn white exactly where a service options section or the footer passes under them (also after scrolling down fast and back up), and while the menu is open. The footer only reaches the logo when the window is shorter than about 765 px (the footer is 726 px tall); same as v1.2.0.

**Menu**
- [ ] Mouse: MENU opens and closes as before; the page behind does not scroll while it is open.
- [ ] Keyboard: Tab to MENU, Enter opens it, focus lands on "Home"; Escape closes it and focus is back on MENU.
- [ ] Keyboard, menu open: keep pressing Tab past X/Twitter. Focus goes to the browser's address bar and then back to the logo, MENU and the menu links; it never lands on the page behind the menu, and the page does not scroll. On a phone-width window too.
- [ ] Safari, mouse: open MENU with a click. No focus ring appears on "Home". Focus does move there on every open, as in a dialog (keyboard and screen reader users need it); Safari should only draw the ring after keyboard use. If a ring shows, tell Claude: a v1.3.1 can move focus only for keyboard opens.
- [ ] VoiceOver (Cmd+F5) on MENU reads "Open menu, collapsed, button", and "Close menu, expanded" when open. With the menu open, VoiceOver only finds the header and the menu.
- [ ] Windows (if at hand): opening the menu does not shift the page sideways.

**FAQ (Home, About, Gallery, Partners, Contact, For Architects, Private Clients)**
- [ ] Looks exactly as before: font, size, colour, spacing.
- [ ] Click opens a question and closes the open one.
- [ ] Tab reaches each question (blue focus ring), Enter and Space open and close it.
- [ ] VoiceOver, reading down the page (Ctrl+Option+Right arrow): closed answers are skipped; an open answer is read after its question.

**Cards and sliders**
- [ ] Service option cards (Home, About, Gallery, Partners): hover scales up with a turquoise border and tag; moving away returns them to teal. On a phone a tap does not leave a card scaled.
- [ ] Home hero slider at 1366 px or wider (see step 0): clicking the slide on the right moves one forward, the one on the left one back (v1.2.0 did nothing on the right and jumped back two on the left). Arrows, drag and the 01/05 counter work.
- [ ] Technologies slider (Home, For Architects): autoplays when in view, arrows work, drag works. Autoplay pauses while the mouse is over it, and while Tab focus is on one of its arrows; it goes on once both have left (tabbing away with the mouse still over it keeps it paused).
- [ ] Resize the window narrower and wider: the active slide stays centred. On a phone, scrolling (address bar sliding) does not make sliders jump.

**Gallery**
- [ ] All 15 tiles in columns (4 desktop, 3 tablet, 2 phone), no overlaps, nothing jumps around once the photos are in.

**Newsletter (footer)**
- [ ] Subscribe with empty fields: both fields turn red, the first one gets focus, no popup. VoiceOver reads the Name field with "Please fill in this field".
- [ ] Keyboard: Tab to Subscribe (VoiceOver: "Subscribe, button"); Space and Enter both press it.
- [ ] Reload, fill both fields, press Subscribe within 5 s: a red message under the button says "Form submitted too quickly. Please wait a few seconds and try again." (no browser popup). VoiceOver reads that message (not "Newsletter failure"), and again on a second quick press. Only submit for real with an address you own.

**Partners**
- [ ] When the logo wall is visible again: logos swap only while the wall is on screen.

**Only if step 5 is done (lazy calendar)**
- [ ] Network tab filtered on `cal.com`: nothing when Home opens; requests start when the calendar is about 800 px below the screen; the calendar appears and can book.
- [ ] Contact: `#SCROLL_HERE` links still land on the booking section.

**Only if step 6 is done (`data-reveal`)**
- [ ] The calendars slide in once when scrolled to; Contact's photo shows straight away.
- [ ] The webflow JS file is smaller once all 7 old interactions are gone (audit CODE-09 step 4).

**Afterwards**
- [ ] Lighthouse (mobile) on Home, Gallery and Contact, compared with the audit numbers.

## Rollback

Footer tag back to `@v1.2.0`, delete the new Global Styles embed, publish (both in the same publish: v1.3.0 without the embed has still rings, no card hover and a mouse-only FAQ). If step 5 is done, put Cal.com's original inline snippet back into both embeds first: v1.2.0 does not load the lazy calendar.
