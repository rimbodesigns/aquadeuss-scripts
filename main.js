/*
 * Aquadeuss site scripts (staging-aquadeuss.webflow.io)
 * Migrated from Slater project 17429 on 2026-11-14. Originals in slater/.
 * v1.1.0: reduced-motion support, logo timer pauses in background tabs, service-card hover on every page.
 * v1.2.0: logo and MENU turn white over [data-nav-theme="dark"] sections and while the menu is open.
 * v1.3.0: audit package P1: errors stay contained, scroll effects re-measure, keyboard FAQ and menu, CSS hovers, lazy Cal.com ready.
 * One section per page or feature; the router at the bottom decides what runs where.
 * Needs GSAP + ScrollTrigger, CustomEase, Draggable, InertiaPlugin (Webflow GSAP integration),
 * registered by the inline gsap.registerPlugin(...) in the Webflow footer before this file
 * (SplitText is loaded there too but nothing here uses it).
 * Needs css/global.css in a Global Styles embed (the compact block in release-1.3.0.md): orbit spin,
 * card hover, white logo/MENU, FAQ buttons. Keep that embed as long as this file is v1.3.0 or later.
 */
(() => {

// Visitors who ask their device for less motion get no endless spins and no parallax.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Runs one feature. If it throws, the error is logged and the next feature still runs
// (before v1.3.0 one error, e.g. the missing menu on the 404 page, stopped everything after it).
function safe(name, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[aquadeuss] ${name} failed:`, err);
  }
}

// Site-wide ease and tween defaults. They change every GSAP animation on the site
// (menu, sliders, footer), so they are set here, before any feature creates a tween.
safe("eases", () => {
  CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
  gsap.defaults({
    ease: "main",
    duration: 0.7
  });
});

// A brand colour from the Webflow variables (published CSS names), so a palette change in Webflow
// reaches main.js too. The hex is the fallback if the variable is renamed or missing.
function brandColor(variable, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
}

// Calls fn once the window WIDTH changed and then stayed put for `delay` ms. Phones fire resize
// whenever the address bar slides in or out; that only changes the height, which moves nothing here.
function onWidthChange(fn, delay = 150) {
  let lastWidth = window.innerWidth;
  let timer;
  const handler = () => {
    if (window.innerWidth === lastWidth) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      lastWidth = window.innerWidth;
      fn();
    }, delay);
  };
  window.addEventListener("resize", handler);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("resize", handler);
  };
}

// ---------------------------------------------------------------------------
// Shared helper: GSAP seamless loop (was duplicated in GLOBAL.js and HOME.js,
// the two copies were identical apart from comments and whitespace)
// ---------------------------------------------------------------------------
// GSAP Helper function to create a looping slider
// Read more: https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop
function horizontalLoop(items, config) {
  let timeline;
  items = gsap.utils.toArray(items);
  config = config || {};
  gsap.context(() => {
    let onChange = config.onChange,
      lastIndex = 0,
      tl = gsap.timeline({
        repeat: config.repeat,
        onUpdate: onChange && function () {
          let i = tl.closestIndex();
          if (lastIndex !== i) {
            lastIndex = i;
            onChange(items[i], i);
          }
        },
        paused: config.paused,
        defaults: { ease: "none" },
        onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)
      }),
      length = items.length,
      startX = items[0].offsetLeft,
      times = [],
      widths = [],
      spaceBefore = [],
      xPercents = [],
      curIndex = 0,
      indexIsDirty = false,
      center = config.center,
      pixelsPerSecond = (config.speed || 1) * 100,
      snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1),
      timeOffset = 0,
      container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] ||
      items[0].parentNode,
      totalWidth,
      getTotalWidth = () => items[length - 1].offsetLeft + xPercents[length - 1] / 100 * widths[
        length - 1] - startX + spaceBefore[0] + items[length - 1].offsetWidth * gsap
      .getProperty(items[length - 1], "scaleX") + (parseFloat(config.paddingRight) || 0),
      populateWidths = () => {
        let b1 = container.getBoundingClientRect(),
          b2;
        items.forEach((el, i) => {
          widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
          xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] *
            100 + gsap.getProperty(el, "xPercent"));
          b2 = el.getBoundingClientRect();
          spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
          b1 = b2;
        });
        gsap.set(items, {
          xPercent: i => xPercents[i]
        });
        totalWidth = getTotalWidth();
      },
      timeWrap,
      populateOffsets = () => {
        timeOffset = center ? tl.duration() * (container.offsetWidth / 2) / totalWidth : 0;
        center && times.forEach((t, i) => {
          times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 /
            totalWidth - timeOffset);
        });
      },
      getClosest = (values, value, wrap) => {
        let i = values.length,
          closest = 1e10,
          index = 0,
          d;
        while (i--) {
          d = Math.abs(values[i] - value);
          if (d > wrap / 2) {
            d = wrap - d;
          }
          if (d < closest) {
            closest = d;
            index = i;
          }
        }
        return index;
      },
      populateTimeline = () => {
        let i, item, curX, distanceToStart, distanceToLoop;
        tl.clear();
        for (i = 0; i < length; i++) {
          item = items[i];
          curX = xPercents[i] / 100 * widths[i];
          distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
          distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
          tl.to(item, {
              xPercent: snap((curX - distanceToLoop) / widths[i] * 100),
              duration: distanceToLoop / pixelsPerSecond
            }, 0)
            .fromTo(item, {
                xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] *
                  100)
              }, {
                xPercent: xPercents[i],
                duration: (curX - distanceToLoop +
                  totalWidth - curX) / pixelsPerSecond,
                immediateRender: false
              },
              distanceToLoop / pixelsPerSecond)
            .add("label" + i, distanceToStart / pixelsPerSecond);
          times[i] = distanceToStart / pixelsPerSecond;
        }
        timeWrap = gsap.utils.wrap(0, tl.duration());
      },
      refresh = (deep) => {
        let progress = tl.progress();
        tl.progress(0, true);
        populateWidths();
        deep && populateTimeline();
        populateOffsets();
        deep && tl.draggable ? tl.time(times[curIndex], true) : tl.progress(progress, true);
      },
      onResize = () => refresh(true),
      proxy;
    gsap.set(items, { x: 0 });
    populateWidths();
    populateTimeline();
    populateOffsets();
    // Re-measure only after a real width change, once resizing has stopped (was: on every resize event).
    const stopResize = onWidthChange(onResize);

    function toIndex(index, vars) {
      vars = vars || {};
      (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length :
        length); // always go in the shortest direction
      let newIndex = gsap.utils.wrap(0, length, index),
        time = times[newIndex];
      if (time > tl.time() !== index > curIndex && index !==
        curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
        time += tl.duration() * (index > curIndex ? 1 : -1);
      }
      if (time < 0 || time > tl.duration()) {
        vars.modifiers = { time: timeWrap };
      }
      curIndex = newIndex;
      vars.overwrite = true;
      gsap.killTweensOf(proxy);
      return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
    }
    tl.toIndex = (index, vars) => toIndex(index, vars);
    tl.closestIndex = setCurrent => {
      let index = getClosest(times, tl.time(), tl.duration());
      if (setCurrent) {
        curIndex = index;
        indexIsDirty = false;
      }
      return index;
    };
    tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
    tl.next = vars => toIndex(tl.current() + 1, vars);
    tl.previous = vars => toIndex(tl.current() - 1, vars);
    tl.times = times;
    tl.progress(1, true).progress(0, true); // pre-render for performance
    if (config.reversed) {
      tl.vars.onReverseComplete();
      tl.reverse();
    }
    if (config.draggable && typeof (Draggable) === "function") {
      proxy = document.createElement("div")
      let wrap = gsap.utils.wrap(0, 1),
        ratio, startProgress, draggable, dragSnap, lastSnap, initChangeX, wasPlaying,
        align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) *
          ratio)),
        syncIndex = () => tl.closestIndex(true);
      typeof (InertiaPlugin) === "undefined" && console.warn(
        "InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club"
      );
      draggable = Draggable.create(proxy, {
        trigger: items[0].parentNode,
        type: "x",
        onPressInit() {
          let x = this.x;
          gsap.killTweensOf(tl);
          wasPlaying = !tl.paused();
          tl.pause();
          startProgress = tl.progress();
          refresh();
          ratio = 1 / totalWidth;
          initChangeX = (startProgress / -ratio) - x;
          gsap.set(proxy, { x: startProgress / -ratio });
        },
        onDrag: align,
        onThrowUpdate: align,
        overshootTolerance: 0,
        inertia: true,
        snap(value) {
          if (Math.abs(startProgress / -ratio - this.x) < 10) {
            return lastSnap + initChangeX
          }
          let time = -(value * ratio) * tl.duration(),
            wrappedTime = timeWrap(time),
            snapTime = times[getClosest(times, wrappedTime, tl.duration())],
            dif = snapTime - wrappedTime;
          Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl
            .duration());
          lastSnap = (time + dif) / tl.duration() / -ratio;
          return lastSnap;
        },
        onRelease() {
          syncIndex();
          draggable.isThrowing && (indexIsDirty = true);
        },
        onThrowComplete: () => {
          syncIndex();
          wasPlaying && tl.play();
        }
      })[0];
      tl.draggable = draggable;
    }
    tl.closestIndex(true);
    lastIndex = curIndex;
    onChange && onChange(items[curIndex], curIndex);
    timeline = tl;
    return stopResize;
  });
  return timeline;

}

// ---------------------------------------------------------------------------
// adGlobal: every page (Slater 48613 GLOBAL.js)
// ---------------------------------------------------------------------------
function adGlobal() {
  // The Home orbit rings ([rotate360]) spin in CSS since v1.3.0 (css/global.css): the browser
  // runs that off the main thread, and visitors who ask for less motion get still rings.
  // The #LOGO_ICON rotation timer is gone: no page has that element (v1.1.0 already kept it idle).

  // A number on the attribute still sets the seconds per turn, as before v1.3.0 (rotate360="20");
  // empty keeps the CSS default of 12 s. The CSS reads it as --spin-duration.
  function initOrbitSpeed() {
    document.querySelectorAll("[rotate360]").forEach((el) => {
      const seconds = parseFloat(el.getAttribute("rotate360"));
      if (seconds > 0) el.style.setProperty("--spin-duration", `${seconds}s`);
    });
  }
  safe("orbit speed", initOrbitSpeed);

  //PARALAX
  //PARALAX
  //PARALAX
  //PARALAX

  function initGlobalParallax() {
    const mm = gsap.matchMedia()

    // gsap.matchMedia records the tweens made in here and reverts them itself when the
    // breakpoint changes, so no extra gsap.context is needed.
    mm.add(
      {
        isMobile: "(max-width:479px)",
        isMobileLandscape: "(max-width:767px)",
        isTablet: "(max-width:991px)",
        isDesktop: "(min-width:992px)"
      },
      (context) => {
        const { isMobile, isMobileLandscape, isTablet } = context.conditions

        document.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
          // Check if this trigger has to be disabled on smaller breakpoints
          const disable = trigger.getAttribute("data-parallax-disable")
          if (
            (disable === "mobile" && isMobile) ||
            (disable === "mobileLandscape" && isMobileLandscape) ||
            (disable === "tablet" && isTablet)
          ) {
            return
          }

          // Optional: you can target an element inside a trigger if necessary
          const target = trigger.querySelector('[data-parallax="target"]') || trigger

          // Get the direction value to decide between xPercent or yPercent tween
          const direction = trigger.getAttribute("data-parallax-direction") || "vertical"
          const prop = direction === "horizontal" ? "xPercent" : "yPercent"

          // Get the scrub value, our default is 'true' because that feels nice with Lenis
          const scrubAttr = trigger.getAttribute("data-parallax-scrub")
          const scrub = scrubAttr ? parseFloat(scrubAttr) : true

          // Get the start position in %
          const startAttr = trigger.getAttribute("data-parallax-start")
          const startVal = startAttr !== null ? parseFloat(startAttr) : 20

          // Get the end position in %
          const endAttr = trigger.getAttribute("data-parallax-end")
          const endVal = endAttr !== null ? parseFloat(endAttr) : -20

          // Get the start value of the ScrollTrigger
          const scrollStartRaw = trigger.getAttribute("data-parallax-scroll-start") ||
            "top bottom"
          const scrollStart = `clamp(${scrollStartRaw})`

          // Get the end value of the ScrollTrigger
          const scrollEndRaw = trigger.getAttribute("data-parallax-scroll-end") ||
            "bottom top"
          const scrollEnd = `clamp(${scrollEndRaw})`

          gsap.fromTo(
            target, {
              [prop]: startVal
            },
            {
              [prop]: endVal,
              ease: "none",
              scrollTrigger: {
                trigger,
                start: scrollStart,
                end: scrollEnd,
                scrub,
              },
            }
          )
        })
      }
    )
  }
  if (!reduceMotion) safe("parallax", initGlobalParallax)

  //FOOTER MENU
  //FOOTER MENU
  //FOOTER MENU

  function initFooterParallax() {
    document.querySelectorAll('[data-footer-parallax]').forEach(el => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'clamp(top bottom)',
          end: 'clamp(top top)',
          scrub: true
        }
      });

      const inner = el.querySelector('[data-footer-parallax-inner]');

      if (inner) {
        tl.from(inner, {
          yPercent: -66,
          ease: 'linear'
        });
      }
    });
  }
  if (!reduceMotion) safe("footer parallax", initFooterParallax);

  //NAV MENU
  //NAV MENU
  //NAV MENU
  //NAV MENU

  function initSideNavigationWipeEffect() {
    let navWrap = document.querySelector(".nav")
    let menuButton = document.querySelector(".menu-button")
    // The 404 and password pages have no NavMenu.
    if (!navWrap || !menuButton) return;
    let state = navWrap.getAttribute("data-nav")
    let overlay = navWrap.querySelector(".overlay")
    let menu = navWrap.querySelector(".menu")
    let bgPanels = navWrap.querySelectorAll(".bg-panel")
    let menuToggles = document.querySelectorAll("[data-menu-toggle]")
    let menuLinks = navWrap.querySelectorAll(".menu-link")
    let fadeTargets = navWrap.querySelectorAll("[data-menu-fade]")
    let menuButtonTexts = menuButton.querySelectorAll("p")
    let menuButtonIcon = menuButton.querySelector(".menu-button-icon")
    // MENU text: dark blue on the page, light on the open (dark blue) menu
    const darkBlue = brandColor("--aqua-deuss-bleu--dark-bleu", "#001a54")
    const light = brandColor("--background-colors--dim_turqyase", "#eff8fb")

    // Screen readers: one clear name instead of "MenuClose" (both text layers were read),
    // whether the menu is open, and which element it opens. Set here so the NavMenu needs no edit.
    if (menu && !menu.id) menu.id = "site-menu"
    menuButton.removeAttribute("role") // it is already a <button>
    menuButton.setAttribute("aria-label", "Open menu")
    menuButton.setAttribute("aria-expanded", "false")
    if (menu) menuButton.setAttribute("aria-controls", menu.id)
    menuButtonTexts.forEach((p) => p.setAttribute("aria-hidden", "true"))
    navWrap.querySelectorAll(".menu-link .eyebrow").forEach((n) => n.setAttribute("aria-hidden", "true")) // "01" to "07"

    // While the menu is open, everything outside the menu and the header is inert: Tab stays in
    // the header and the menu (it used to walk on into the page hidden behind it, and scroll it),
    // and screen readers only find the menu. Works at any nesting depth: every sibling of the menu
    // and of its ancestors up to <body>, except the part that holds the MENU button, so the button
    // keeps closing the menu wherever the header sits. closeNav releases exactly the elements set here.
    let inertEls = []
    const setPageInert = (on) => {
      if (!on) {
        inertEls.forEach((el) => { el.inert = false })
        inertEls = []
        return
      }
      for (let el = navWrap; el.parentElement && el !== document.body; el = el.parentElement) {
        Array.from(el.parentElement.children).forEach((sibling) => {
          if (sibling === el || sibling.inert || sibling.contains(menuButton) ||
            sibling.matches("script, style, link")) return
          sibling.inert = true
          inertEls.push(sibling)
        })
      }
    }

    // The page behind the open menu stays put. Locomotive stops it; without Locomotive (reduce
    // motion, where the footer code skips it) the page itself stops scrolling. No sideways shift:
    // css/global.css keeps the scrollbar's space (scrollbar-gutter).
    const lockScroll = (on) => {
      if (window.locomotiveScroll) {
        if (on) window.locomotiveScroll.stop()
        else window.locomotiveScroll.start()
      } else {
        document.documentElement.style.overflow = on ? "hidden" : ""
      }
    }

    let tl = gsap.timeline()

    const openNav = () => {
      navWrap.setAttribute("data-nav", "open")
      menuButton.setAttribute("aria-expanded", "true")
      menuButton.setAttribute("aria-label", "Close menu")
      lockScroll(true)
      setPageInert(true)

      tl.clear()
        .set(navWrap, { display: "block" })
        .set(menu, { xPercent: 0 }, "<")
        .fromTo(menuButtonTexts, { yPercent: 0, color: darkBlue }, {
          yPercent: -100,
          color: light,
          stagger: 0.2
        })
        .fromTo(menuButtonIcon, { rotate: 0, color: darkBlue }, { rotate: 315, color: light },
          "<")
        .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1 }, "<")
        .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
        .fromTo(menuLinks, { yPercent: 200, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05 },
          "<+=0.35")
        .fromTo(fadeTargets, { autoAlpha: 0, yPercent: 50 }, {
          autoAlpha: 1,
          yPercent: 0,
          stagger: 0.04
        }, "<+=0.2")
        // Focus lands on the first link once the menu is in, as in a dialog, also after a mouse
        // or tap open (no ring then: the site's focus style is :focus-visible only). Skipped if
        // the visitor already tabbed somewhere else while it animated.
        .add(() => {
          const focused = document.activeElement
          if (menuLinks[0] && (focused === menuButton || focused === document.body || !focused)) {
            menuLinks[0].focus({ preventScroll: true })
          }
        })
      // Less motion: no 1.4 s wipe, the menu is simply there (and focus moves at once)
      if (reduceMotion) tl.progress(1)
    }

    const closeNav = () => {
      navWrap.setAttribute("data-nav", "closed")
      menuButton.setAttribute("aria-expanded", "false")
      menuButton.setAttribute("aria-label", "Open menu")
      lockScroll(false)
      setPageInert(false)
      // Focus was inside the menu, which is about to be hidden: give it back to the button
      if (navWrap.contains(document.activeElement)) menuButton.focus({ preventScroll: true })

      tl.clear()
        .to(overlay, { autoAlpha: 0 })
        .to(menu, { xPercent: 120 }, "<")
        .to(menuButtonTexts, { yPercent: 0, color: darkBlue }, "<")
        .to(menuButtonIcon, { rotate: 0, color: darkBlue }, "<")
        .set(navWrap, { display: "none" })
      if (reduceMotion) tl.progress(1)
    }

    // Toggle menu open / close depending on its current state
    menuToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        state = navWrap.getAttribute("data-nav");
        if (state === "open") {
          closeNav();
        } else {
          openNav();
        }
      });
    });

    // If menu is open, you can close it using the "escape" key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navWrap.getAttribute("data-nav") === "open") {
        closeNav();
      }
    });
  }

  safe("nav menu", initSideNavigationWipeEffect);

  //FAQ
  //FAQ
  //FAQ

  function initAccordionCSS() {
    const accordions = document.querySelectorAll('[data-accordion-css-init]');
    if (!accordions.length) return;
    let answerCount = 0; // ids stay unique even with two FAQs on one page

    // The buttons below only look like the old heading text with the reset in css/global.css
    // (Global Styles embed), which also sets --ad-faq-buttons. Without it they would show as grey
    // browser buttons, so the questions stay as they were (mouse only) and the console says why.
    const buttonCss = getComputedStyle(document.documentElement)
      .getPropertyValue('--ad-faq-buttons').trim() === '1';
    if (!buttonCss) console.warn('[aquadeuss] FAQ: css/global.css embed not found, questions stay mouse-only');

    accordions.forEach((accordion) => {
      const closeSiblings = accordion.getAttribute('data-accordion-close-siblings') === 'true';

      // Keyboard and screen readers: each question's text moves into a real <button> inside its
      // heading, so Tab reaches it, Enter and Space open it, and aria-expanded says whether it is
      // open. The heading stays, so the questions keep their place in the page outline.
      // The button looks like plain text through .accordion-css__btn in css/global.css.
      if (buttonCss) accordion.querySelectorAll('[data-accordion-toggle]').forEach((toggle) => {
        const item = toggle.closest('[data-accordion-status]');
        const heading = toggle.querySelector('h2, h3, h4');
        const answer = item && item.querySelector('.accordion-css__item-bottom');
        if (!heading || !answer || heading.querySelector('button')) return;
        answerCount += 1;
        if (!answer.id) answer.id = `faq-answer-${answerCount}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'accordion-css__btn';
        button.setAttribute('aria-controls', answer.id);
        button.append(...heading.childNodes);
        heading.appendChild(button);
      });

      const syncExpanded = () => {
        accordion.querySelectorAll('[data-accordion-status]').forEach((item) => {
          const button = item.querySelector('.accordion-css__btn');
          if (button) button.setAttribute('aria-expanded',
            String(item.getAttribute('data-accordion-status') === 'active'));
        });
      };
      syncExpanded();

      accordion.addEventListener('click', (event) => {
        const toggle = event.target.closest('[data-accordion-toggle]');
        if (!toggle) return; // Exit if the clicked element is not a toggle

        const singleAccordion = toggle.closest('[data-accordion-status]');
        if (!singleAccordion) return; // Exit if no accordion container is found

        const isActive = singleAccordion.getAttribute('data-accordion-status') === 'active';
        singleAccordion.setAttribute('data-accordion-status', isActive ? 'not-active' :
          'active');

        // When [data-accordion-close-siblings="true"]
        if (closeSiblings && !isActive) {
          accordion.querySelectorAll('[data-accordion-status="active"]').forEach((
            sibling) => {
            if (sibling !== singleAccordion) sibling.setAttribute('data-accordion-status',
              'not-active');
          });
        }

        syncExpanded(); // also "false" on the questions that just closed
      });
    });
  }
  safe("faq", initAccordionCSS);

  // logo section
  // logo section
  // logo section
  // logo section

  function initLogoWallCycle() {
    const loopDelay = 1.5; // Loop Duration
    const duration = 0.9; // Animation Duration

    document.querySelectorAll('[data-logo-wall-cycle-init]').forEach(root => {
      const list = root.querySelector('[data-logo-wall-list]');
      if (!list) return;
      const items = Array.from(list.querySelectorAll('[data-logo-wall-item]'));

      const shuffleFront = root.getAttribute('data-logo-wall-shuffle') !== 'false';
      const originalTargets = items
        .map(item => item.querySelector('[data-logo-wall-target]'))
        .filter(Boolean);

      let visibleItems = [];
      let visibleCount = 0;
      let pool = [];
      let pattern = [];
      let patternIndex = 0;
      let tl;
      let st; // the ScrollTrigger that says whether the wall is on screen

      // Swap logos only while the wall is on screen and the tab is visible
      // (it used to start at page load and restart on every return to the tab).
      // Never for visitors who ask for less motion: the first set of logos just stays.
      const playIfVisible = () => {
        if (!reduceMotion && st && st.isActive && !document.hidden) tl.play();
        else tl.pause();
      };

      function isVisible(el) {
        return window.getComputedStyle(el).display !== 'none';
      }

      function shuffleArray(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      function setup() {
        if (tl) {
          tl.kill();
        }
        visibleItems = items.filter(isVisible);
        visibleCount = visibleItems.length;

        pattern = shuffleArray(
          Array.from({ length: visibleCount }, (_, i) => i)
        );
        patternIndex = 0;

        // remove all injected targets
        items.forEach(item => {
          item.querySelectorAll('[data-logo-wall-target]').forEach(old => old.remove());
        });

        pool = originalTargets.map(n => n.cloneNode(true));

        let front, rest;
        if (shuffleFront) {
          const shuffledAll = shuffleArray(pool);
          front = shuffledAll.slice(0, visibleCount);
          rest = shuffleArray(shuffledAll.slice(visibleCount));
        } else {
          front = pool.slice(0, visibleCount);
          rest = shuffleArray(pool.slice(visibleCount));
        }
        pool = front.concat(rest);

        for (let i = 0; i < visibleCount; i++) {
          const parent =
            visibleItems[i].querySelector('[data-logo-wall-target-parent]') ||
            visibleItems[i];
          parent.appendChild(pool.shift());
        }

        tl = gsap.timeline({ repeat: -1, repeatDelay: loopDelay, paused: true });
        tl.call(swapNext);
        playIfVisible();
      }

      function swapNext() {
        const nowCount = items.filter(isVisible).length;
        if (nowCount !== visibleCount) {
          setup();
          return;
        }
        if (!pool.length) return;

        const idx = pattern[patternIndex % visibleCount];
        patternIndex++;

        const container = visibleItems[idx];
        const parent =
          container.querySelector('[data-logo-wall-target-parent]') ||
          container.querySelector('*:has(> [data-logo-wall-target])') ||
          container;
        const existing = parent.querySelectorAll('[data-logo-wall-target]');
        if (existing.length > 1) return;

        const current = parent.querySelector('[data-logo-wall-target]');
        const incoming = pool.shift();

        gsap.set(incoming, { yPercent: 50, autoAlpha: 0 });
        parent.appendChild(incoming);

        if (current) {
          gsap.to(current, {
            yPercent: -50,
            autoAlpha: 0,
            duration,
            ease: "expo.inOut",
            onComplete: () => {
              current.remove();
              pool.push(current);
            }
          });
        }

        gsap.to(incoming, {
          yPercent: 0,
          autoAlpha: 1,
          duration,
          delay: 0.1,
          ease: "expo.inOut"
        });
      }

      setup();

      st = ScrollTrigger.create({
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: playIfVisible
      });
      playIfVisible();

      document.addEventListener('visibilitychange', playIfVisible);

      // With no swaps, swapNext never notices a breakpoint that shows more slots: fill them here.
      if (reduceMotion) onWidthChange(() => {
        if (items.filter(isVisible).length !== visibleCount) setup();
      });
    });
  }

  safe("logo wall", initLogoWallCycle);

  function initDirectionalButtonHover() {
    // Button hover animation
    document.querySelectorAll('[data-btn-hover]').forEach(button => {
      button.addEventListener('mouseenter', handleHover);
      button.addEventListener('mouseleave', handleHover);
    });

    function handleHover(event) {
      const button = event.currentTarget;
      const buttonRect = button.getBoundingClientRect();

      // Get the button's dimensions and center
      const buttonWidth = buttonRect.width;
      const buttonHeight = buttonRect.height;
      const buttonCenterX = buttonRect.left + buttonWidth / 2;
      const buttonCenterY = buttonRect.top + buttonHeight / 2;

      // Calculate mouse position
      const mouseX = event.clientX;
      const mouseY = event.clientY;

      // Offset from the top-left corner in percentage
      const offsetXFromLeft = ((mouseX - buttonRect.left) / buttonWidth) * 100;
      const offsetYFromTop = ((mouseY - buttonRect.top) / buttonHeight) * 100;

      // Offset from the center in percentage
      let offsetXFromCenter = ((mouseX - buttonCenterX) / (buttonWidth / 2)) * 50;

      // Convert to absolute values
      offsetXFromCenter = Math.abs(offsetXFromCenter);

      // Update position and size of .btn__circle
      const circle = button.querySelector('.btn__circle');
      if (circle) {
        circle.style.left = `${offsetXFromLeft.toFixed(1)}%`;
        circle.style.top = `${offsetYFromTop.toFixed(1)}%`;
        circle.style.width = `${115 + offsetXFromCenter.toFixed(1) * 2}%`;
      }
    }
  }

  safe("button hover", initDirectionalButtonHover);

  //testimo + tech
  //testimo + tech
  //testimo + tech

  function initSliders() {
    CustomEase.create("osmo-ease", "0.625, 0.05, 0, 1")

    const sliderWrappers = gsap.utils.toArray(document.querySelectorAll(
      '[data-centered-slider="wrapper"]'));

    sliderWrappers.forEach((sliderWrapper) => {
      const slides = gsap.utils.toArray(sliderWrapper.querySelectorAll(
        '[data-centered-slider="slide"]'));
      // Bullets: only the WALL OF LOVE component has them (on no page yet, waiting for testimonials).
      const bullets = gsap.utils.toArray(sliderWrapper.querySelectorAll(
        '[data-centered-slider="bullet"]'));
      const prevButton = sliderWrapper.querySelector('[data-centered-slider="prev-button"]');
      const nextButton = sliderWrapper.querySelector('[data-centered-slider="next-button"]');

      let activeElement;
      let activeBullet;
      let currentIndex = 0;
      let autoplay;
      let keyboardInside = false; // keyboard focus is on the arrows: autoplay waits

      // Autoplay is now enabled/disabled via a boolean attribute.
      const autoplayEnabled = sliderWrapper.getAttribute('data-slider-autoplay') === 'true';

      // If enabled, get the autoplay duration (in seconds) from the separate attribute.
      const autoplayDuration = autoplayEnabled ? parseFloat(sliderWrapper.getAttribute(
        'data-slider-autoplay-duration')) || 0 : 0;

      // Dynamically assign unique IDs to slides
      slides.forEach((slide, i) => {
        slide.setAttribute("id", `slide-${i}`);
      });

      // Set ARIA attributes on bullets if they exist
      if (bullets && bullets.length > 0) {
        bullets.forEach((bullet, i) => {
          bullet.setAttribute("aria-controls", `slide-${i}`);
          bullet.setAttribute("aria-selected", i === currentIndex ? "true" : "false");
        });
      }

      const loop = horizontalLoop(slides, {
        paused: true,
        draggable: true,
        center: true,
        onChange: (element, index) => {
          currentIndex = index;

          if (activeElement) activeElement.classList.remove("active");
          element.classList.add("active");
          activeElement = element;

          if (bullets && bullets.length > 0) {
            if (activeBullet) activeBullet.classList.remove("active");
            if (bullets[index]) {
              bullets[index].classList.add("active");
              activeBullet = bullets[index];
            }
            bullets.forEach((bullet, i) => {
              bullet.setAttribute("aria-selected", i === index ? "true" : "false");
            });
          }

        }
      });

      // On initialization, center the slider
      loop.toIndex(2, { duration: 0.01 });

      function startAutoplay() {
        // No autoplay for visitors who ask for less motion, nor while a keyboard user is on it
        if (reduceMotion || keyboardInside) return;
        if (autoplayDuration > 0 && !autoplay) {
          const repeat = () => {
            loop.next({ ease: "osmo-ease", duration: 0.725 });
            autoplay = gsap.delayedCall(autoplayDuration, repeat);
          };
          autoplay = gsap.delayedCall(autoplayDuration, repeat);
        }
      }

      function stopAutoplay() {
        if (autoplay) {
          autoplay.kill();
          autoplay = null;
        }
      }

      // Start/stop autoplay based on viewport visibility via ScrollTrigger
      ScrollTrigger.create({
        trigger: sliderWrapper,
        start: "top bottom",
        end: "bottom top",
        onEnter: startAutoplay,
        onLeave: stopAutoplay,
        onEnterBack: startAutoplay,
        onLeaveBack: stopAutoplay
      });

      // Pause autoplay on mouse hover over the slider
      sliderWrapper.addEventListener("mouseenter", stopAutoplay);
      sliderWrapper.addEventListener("mouseleave", () => {
        if (ScrollTrigger.isInViewport(sliderWrapper)) startAutoplay();
      });

      // ...and while keyboard focus is inside it, so keyboard users can stop it too (WCAG 2.2.2).
      // Keyboard focus only (:focus-visible): a mouse click on an arrow behaves as before.
      const isKeyboardFocus = (el) => {
        try { return el.matches(":focus-visible"); } catch (err) { return true; } // older browsers
      };
      sliderWrapper.addEventListener("focusin", (event) => {
        if (!isKeyboardFocus(event.target)) return;
        keyboardInside = true;
        stopAutoplay();
      });
      sliderWrapper.addEventListener("focusout", (event) => {
        if (!keyboardInside || sliderWrapper.contains(event.relatedTarget)) return;
        keyboardInside = false;
        // The mouse may still be over it: then mouseleave restarts autoplay later
        if (ScrollTrigger.isInViewport(sliderWrapper) && !sliderWrapper.matches(":hover")) startAutoplay();
      });

      // Slide click event for direct navigation
      slides.forEach((slide, i) => {
        slide.addEventListener("click", () => {
          loop.toIndex(i, { ease: "osmo-ease", duration: 0.725 });
        });
      });

      // Bullets click event for direct navigation (if available)
      if (bullets && bullets.length > 0) {
        bullets.forEach((bullet, i) => {
          bullet.addEventListener("click", () => {
            loop.toIndex(i, { ease: "osmo-ease", duration: 0.725 });
            if (activeBullet) activeBullet.classList.remove("active");
            bullet.classList.add("active");
            activeBullet = bullet;
            bullets.forEach((b, j) => {
              b.setAttribute("aria-selected", j === i ? "true" : "false");
            });
          });
        });
      }

      // Prev/Next button listeners (if the buttons exist)
      if (prevButton) {
        prevButton.addEventListener("click", () => {
          let newIndex = currentIndex - 1;
          if (newIndex < 0) newIndex = slides.length - 1;
          loop.toIndex(newIndex, { ease: "osmo-ease", duration: 0.725 });
        });
      }

      if (nextButton) {
        nextButton.addEventListener("click", () => {
          let newIndex = currentIndex + 1;
          if (newIndex >= slides.length) newIndex = 0;
          loop.toIndex(newIndex, { ease: "osmo-ease", duration: 0.725 });
        });
      }

    });
  }

  safe("sliders", initSliders)

  //BasicForm
  //BasicForm
  //BasicForm
  //BasicForm

  function initBasicFormValidation() {
    const forms = document.querySelectorAll('[data-form-validate]');
    let errorCount = 0; // unique ids for the error texts below

    forms.forEach((form) => {
      const fields = form.querySelectorAll('[data-validate] input, [data-validate] textarea');
      const submitButtonDiv = form.querySelector(
        '[data-submit]'); // The div wrapping the submit button
      const submitInput = submitButtonDiv && submitButtonDiv.querySelector(
        'input[type="submit"]'); // The actual submit button
      if (!submitButtonDiv || !submitInput) return; // a form without the custom Subscribe button

      // Capture the form load time
      const formLoadTime = new Date().getTime(); // Timestamp when the form was loaded

      // Live checks are added once per form; they used to be added again on every Subscribe click.
      let liveStarted = false;

      // Messages show inline in the form's own error box (.w-form-fail) instead of a
      // blocking alert(). Webflow's own "Something went wrong" text comes back afterwards.
      // A box without .form-notification-p gets its own text element for the note, so the
      // box's other children (background, icon) are never overwritten; any other text in that
      // box is hidden while the note shows, so only the note is seen and read.
      const failBox = form.querySelector('.w-form-fail');
      const failText = failBox && failBox.querySelector('.form-notification-p');
      const webflowFailText = failText ? failText.textContent : '';
      let saved = null; // Webflow's role and aria-label on the box while a note is shown
      let ownText = null;
      let hiddenText = []; // [node, its display or text] hidden next to ownText
      let noteTimer;
      const setAttr = (name, value) => {
        if (value === null) failBox.removeAttribute(name);
        else failBox.setAttribute(name, value);
      };
      const showNote = (text) => {
        if (!failBox) return;
        if (!failText && !ownText) {
          hiddenText = Array.from(failBox.childNodes)
            .filter((n) => (n.nodeType === 1 || n.nodeType === 3) && n.textContent.trim())
            .map((n) => [n, n.nodeType === 1 ? n.style.display : n.nodeValue]);
          hiddenText.forEach(([n]) => { if (n.nodeType === 1) n.style.display = 'none'; else n.nodeValue = ''; });
          ownText = failBox.appendChild(document.createElement('div'));
        }
        const target = failText || ownText;
        clearTimeout(noteTimer);
        if (saved) {
          // Already showing (a second fast Subscribe): empty it and put the text back a moment
          // later. Screen readers only speak an alert again when its text changes.
          target.textContent = '';
          noteTimer = setTimeout(() => { target.textContent = text; }, 100);
          return;
        }
        saved = { role: failBox.getAttribute('role'), label: failBox.getAttribute('aria-label') };
        failBox.setAttribute('role', 'alert'); // read out by screen readers...
        failBox.removeAttribute('aria-label'); // ...as the message, not as Webflow's "Newsletter failure"
        target.textContent = text;
        failBox.style.display = 'block';
      };
      const hideNote = () => {
        if (!saved) return; // Webflow's own message: leave it
        clearTimeout(noteTimer);
        setAttr('role', saved.role);
        setAttr('aria-label', saved.label);
        saved = null;
        failBox.style.display = '';
        if (failText) failText.textContent = webflowFailText;
        if (ownText) { ownText.remove(); ownText = null; }
        hiddenText.forEach(([n, value]) => { if (n.nodeType === 1) n.style.display = value; else n.nodeValue = value; });
        hiddenText = [];
      };

      // Screen readers: each field gets a short error text, linked with aria-describedby and
      // filled only while the field is invalid. Visually hidden: the red border and icon show it.
      const errorTexts = new Map();
      fields.forEach((field) => {
        const text = document.createElement('span');
        text.id = `form-error-${++errorCount}`;
        text.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;' +
          'border:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
        field.closest('[data-validate]').appendChild(text);
        const describedBy = field.getAttribute('aria-describedby');
        field.setAttribute('aria-describedby', describedBy ? `${describedBy} ${text.id}` : text.id);
        errorTexts.set(field, text);
      });

      // Function to validate individual fields (input or textarea)
      const validateField = (field) => {
        const parent = field.closest('[data-validate]'); // Get the parent div
        // minlength once the Designer uses it on the Name field; its old min="1" works until then
        const minLength = field.minLength > 0 ? field.minLength : field.getAttribute('min');
        const maxLength = field.getAttribute('max');
        const type = field.getAttribute('type');
        let isValid = true;

        // Check if the field has content
        if (field.value.trim() !== '') {
          parent.classList.add('is--filled');
        } else {
          parent.classList.remove('is--filled');
        }

        // Validation logic for min and max length
        if (minLength && field.value.length < minLength) {
          isValid = false;
        }

        if (maxLength && field.value.length > maxLength) {
          isValid = false;
        }

        // Validation logic for email input type
        if (type === 'email' && !/\S+@\S+\.\S+/.test(field.value)) {
          isValid = false;
        }

        // Add or remove success/error classes on the parent div
        if (isValid) {
          parent.classList.remove('is--error');
          parent.classList.add('is--success');
        } else {
          parent.classList.remove('is--success');
          parent.classList.add('is--error');
        }
        field.setAttribute('aria-invalid', String(!isValid)); // screen readers hear the red state too
        const errorText = errorTexts.get(field);
        if (errorText) {
          errorText.textContent = isValid ? '' :
            field.value.trim() === '' ? 'Please fill in this field.' :
            type === 'email' ? 'Please enter a valid e-mail address.' :
            'Please check this field.';
        }

        return isValid;
      };

      // Function to validate and start live validation for all fields, focusing on the first field with an error
      const validateAndStartLiveValidationForAll = () => {
        let allValid = true;
        let firstInvalidField = null;

        fields.forEach((field) => {
          const valid = validateField(field);
          if (!valid && !firstInvalidField) {
            firstInvalidField = field; // Track the first invalid field
          }
          if (!valid) {
            allValid = false;
          }
        });

        // From the first Subscribe on, each field re-checks itself while the visitor types
        if (!liveStarted) {
          liveStarted = true;
          fields.forEach((field) => field.addEventListener('input', () => validateField(field)));
        }

        // If there is an invalid field, focus on the first one
        if (firstInvalidField) {
          firstInvalidField.focus();
        }

        return allValid;
      };

      // Anti-spam: Check if form was filled too quickly
      const isSpam = () => {
        const currentTime = new Date().getTime();
        const timeDifference = (currentTime - formLoadTime) /
          1000; // Convert milliseconds to seconds
        return timeDifference < 5; // Return true if form is filled within 5 seconds
      };

      // Validate, then submit through the real (hidden) submit input
      const trySubmit = () => {
        if (!validateAndStartLiveValidationForAll()) {
          hideNote();
          return;
        }
        // Only check for spam after all fields are valid
        if (isSpam()) {
          showNote('Form submitted too quickly. Please wait a few seconds and try again.');
          return; // Stop form submission
        }
        hideNote();
        submitInput.click(); // Simulate a click on the <input type="submit">
      };

      // Handle clicking the custom submit button
      submitButtonDiv.addEventListener('click', trySubmit);

      // The Subscribe control is a div in the Webflow markup: screen readers announce it as a
      // button, and Space presses it like one (Enter goes through the form's keydown below).
      submitButtonDiv.setAttribute('role', 'button');
      submitButtonDiv.addEventListener('keydown', (event) => {
        if (event.key !== ' ') return;
        event.preventDefault(); // no page scroll
        if (!event.repeat) trySubmit();
      });

      // Handle pressing the "Enter" key
      form.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
          event.preventDefault(); // Prevent the default form submission
          trySubmit();
        }
      });
    });
  }

  safe("form validation", initBasicFormValidation);

  // The service option card hover (.option_block) is plain CSS since v1.3.0 (css/global.css).

  // NAV ON DARK
  // The logo and MENU are dark blue. Over sections marked data-nav-theme="dark"
  // (service options, footer, contact booking) and while the menu is open
  // (its panels are dark blue too) they turn white: this toggles .is-on-dark on the
  // header, and the white filter itself is in css/global.css.
  function initNavOnDark() {
    const header = document.querySelector(".nav_menu .header");
    if (!header) return;
    const nav = document.querySelector(".nav_menu .nav");

    const active = new Set();
    const update = () => {
      const menuOpen = nav && nav.getAttribute("data-nav") === "open";
      header.classList.toggle("is-on-dark", menuOpen || active.size > 0);
    };
    // The switch happens where the middle of the header crosses a section edge.
    const line = () => Math.round(header.getBoundingClientRect().top + header.offsetHeight / 2);

    document.querySelectorAll('[data-nav-theme="dark"]').forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: () => `top ${line()}px`,
        end: () => `bottom ${line()}px`,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          self.isActive ? active.add(section) : active.delete(section);
          update();
        }
      });
    });

    if (nav) new MutationObserver(update).observe(nav, { attributes: true, attributeFilter: ["data-nav"] });
    update();
  }

  safe("nav on dark", initNavOnDark);

  // REVEAL
  // Replaces Webflow's old "slide in from bottom" interactions on the calendar embeds, so the
  // ~20 KB interaction engine can go: put data-reveal on the element in Webflow and delete its
  // interaction. Same motion as the preset (from 100 px lower and transparent, 1 s, ease out),
  // once, when it scrolls into view. Unlike the interaction, the element stays visible if this
  // script fails or the visitor asks for less motion. Never use it on what a page opens with
  // (Contact's photo block): that would hide the main image until the script runs.
  function initReveal() {
    if (reduceMotion) return;
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0,
        y: 100,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top bottom", once: true }
      });
    });
  }

  safe("reveal", initReveal);

  // CAL.COM, LAZY
  // The inline Cal.com calendar downloads about 1.8 MB (85 requests) as soon as a page opens,
  // although it sits near the bottom. With the lazy embed markup in Webflow (an empty div with
  // data-cal-lazy, see release-1.3.0.md) it loads once the visitor scrolls within 800 px of it.
  // Does nothing while the embeds still hold Cal.com's own inline snippet.
  function initCalEmbed() {
    const embeds = document.querySelectorAll("[data-cal-lazy]");
    if (!embeds.length) return;
    const started = new Set(); // Cal namespaces already initialised

    const load = (el) => {
      const calLink = el.getAttribute("data-cal-link");
      if (!calLink) return;
      const namespace = el.getAttribute("data-cal-namespace") || "15-min-call";
      const layout = el.getAttribute("data-cal-layout") || "month_view";
      if (!el.id) el.id = `cal-inline-${namespace}`;

      // Cal.com's own loader snippet, unchanged
      (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");

      if (!started.has(namespace)) {
        window.Cal("init", namespace, { origin: "https://app.cal.com" });
        started.add(namespace);
      }
      window.Cal.ns[namespace]("inline", {
        elementOrSelector: `#${el.id}`,
        config: { layout },
        calLink
      });
      window.Cal.ns[namespace]("ui", { hideEventTypeDetails: false, layout });
    };

    if (!("IntersectionObserver" in window)) {
      embeds.forEach(load);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        safe("cal embed load", () => load(entry.target));
      });
    }, { rootMargin: "800px 0px" });
    embeds.forEach((el) => io.observe(el));
  }

  safe("cal embed", initCalEmbed);

  // SCROLL REFRESH
  // ScrollTrigger measures where each effect starts on load. Lazy images, the web fonts and the
  // Cal.com calendar arrive later and push everything below them down, so the parallax and the
  // white logo/MENU switched at the old positions. Re-measure (debounced) whenever the page
  // height changes, and once the fonts are in. Last in adGlobal, so it covers every trigger.
  function initScrollRefresh() {
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 200);
    };

    if ("ResizeObserver" in window) {
      let lastHeight = document.body.offsetHeight;
      new ResizeObserver(() => {
        const height = document.body.offsetHeight;
        if (height === lastHeight) return; // width-only changes: ScrollTrigger handles resize itself
        lastHeight = height;
        refresh();
      }).observe(document.body);
    }

    if (document.fonts) document.fonts.ready.then(refresh);
  }

  safe("scroll refresh", initScrollRefresh);
}

// ---------------------------------------------------------------------------
// adHome: home page only (Slater 48614 HOME.js)
// ---------------------------------------------------------------------------
function adHome() {
  //dragable images hero
  //dragable images hero
  //dragable images hero

  function initDraggableInfiniteGSAPSlider() {

    const wrapper = document.querySelector('[data-slider="list"]');
    if (!wrapper) return;

    const slides = gsap.utils.toArray('[data-slider="slide"]');
    const nextButton = document.querySelector('[data-slider-button="next"]');
    const prevButton = document.querySelector('[data-slider-button="prev"]');

    const totalElement = document.querySelector('[data-slide-count="total"]');
    const stepElement = document.querySelector('[data-slide-count="step"]');
    const stepsParent = stepElement?.parentElement;

    let activeElement;
    const totalSlides = slides.length;

    // Total
    if (totalElement) totalElement.textContent = totalSlides < 10 ? `0${totalSlides}` : totalSlides;

    // Steps (clone)
    if (stepsParent && stepElement) {
      stepsParent.innerHTML = '';
      slides.forEach((_, index) => {
        const stepClone = stepElement.cloneNode(true);
        stepClone.textContent = index + 1 < 10 ? `0${index + 1}` : (index + 1);
        stepsParent.appendChild(stepClone);
      });
    }
    const allSteps = stepsParent ? stepsParent.querySelectorAll('[data-slide-count="step"]') : [];

    // Keep track of the current element & index from onChange
    let currentEl = null;
    let currentIndex = 0;

    function applyActive(el, index, animateNumbers = true) {
      if (activeElement) activeElement.classList.remove('active');
      el.classList.add('active'); // the active slide is the centred one, no offset
      activeElement = el;

      if (allSteps.length) {
        if (animateNumbers) {
          gsap.to(allSteps, { y: `${-100 * index}%`, ease: "power3", duration: 0.45 });
        } else {
          gsap.set(allSteps, { y: `${-100 * index}%` });
        }
      }
    }

    const loop = horizontalLoop(slides, {
      paused: true,
      draggable: true,
      center: true, // <— ENABLED
      onChange: (element, index) => {
        // remember latest
        currentEl = element;
        currentIndex = index;
        // apply for current breakpoint
        applyActive(element, index, true);
      }
    });

    // Click a slide -> it becomes the active (centred) one, on every screen size. Desktop used
    // to go to i - 1, left over from an older offset design: clicking the slide right of the
    // active one did nothing and the one on the left jumped back two.
    slides.forEach((slide, i) => {
      slide.addEventListener("click", () => {
        if (slide.classList.contains("active")) return;
        loop.toIndex(i, { ease: "power3", duration: 0.725 });
      });
    });

    nextButton?.addEventListener("click", () => loop.next({ ease: "power3", duration: 0.725 }));
    prevButton?.addEventListener("click", () => loop.previous({ ease: "power3", duration: 0.725 }));

    if (!currentEl && slides[0]) {
      currentEl = slides[0];
      currentIndex = 0;
      applyActive(currentEl, currentIndex, false);
    }
  }


  safe("hero slider", initDraggableInfiniteGSAPSlider);
}

// ---------------------------------------------------------------------------
// adGallery: /gallery only (Slater 52058 GALERY-test.js)
// ---------------------------------------------------------------------------
function adGallery() {
    function initMasonryGrid() {
    document.querySelectorAll('[data-masonry-list]').forEach(container => {
      const shuffle = container.dataset.masonryShuffle !== 'false';
      let cols, gapPx, colHeights;

      // Take columns and gaps from CSS
      const getVars = () => {
        const cs = getComputedStyle(container);
        cols = parseInt(cs.getPropertyValue('--masonry-col'));
        const rawGap = cs.getPropertyValue('--masonry-gap').trim();
        if (rawGap.endsWith('px')) {
          gapPx = parseFloat(rawGap);
        } else if (rawGap.endsWith('em')) {
          gapPx = parseFloat(rawGap) * parseFloat(cs.fontSize);
        } else if (rawGap.endsWith('rem')) {
          gapPx = parseFloat(rawGap) * parseFloat(getComputedStyle(document.documentElement)
            .fontSize);
        } else {
          gapPx = parseFloat(rawGap);
        }
      };

      // Set the layout
      const layout = () => {
        getVars();
        const wCalc = `(100% - ${(cols - 1)}*var(--masonry-gap)) / ${cols}`;
        colHeights = Array(cols).fill(0);
        container.style.position = 'relative';
        const items = Array.from(container.children);
        items.forEach(el => {
          el.style.position = 'absolute';
          el.style.width = `calc(${wCalc})`;
        });
        // Read every height first, then place the tiles. Reading a height right after moving the
        // previous tile made the browser lay out the page again for every tile.
        const heights = items.map(el => el.offsetHeight);
        items.forEach((el, i) => {
          const idx = shuffle ?
            colHeights.indexOf(Math.min(...colHeights)) :
            (i % cols);
          el.style.top = `${colHeights[idx]}px`;
          el.style.left = `calc(${wCalc}*${idx} + var(--masonry-gap)*${idx})`;
          colHeights[idx] += heights[i] + gapPx;
        });
        container.style.height = `${Math.max(...colHeights)}px`;
      };

      // Tiles without a shape class (is--square, is--tall, is--wide) are 0 px tall until their
      // photo arrives, so every lazy photo counts as on screen and all of them load at once, and
      // the grid jumps as each one lands. Hold a 3:2 space (the shape of most photos) until the
      // photo has loaded. Does nothing once every tile has its shape in Webflow (audit IMG-04).
      // All reads first, then all writes: one style calculation instead of one per tile.
      const unshaped = Array.from(container.querySelectorAll('img'))
        .filter(img => !img.complete)
        .map(img => ({ img, visual: img.closest('.masonry-item__visual') || img.parentElement }))
        .filter(({ visual }) => getComputedStyle(visual).aspectRatio === 'auto');
      unshaped.forEach(({ img, visual }) => {
        visual.style.aspectRatio = '3 / 2';
        const release = () => { visual.style.aspectRatio = ''; };
        img.addEventListener('load', release, { once: true });
        img.addEventListener('error', release, { once: true });
      });

      // Debounce function
      const debounce = (fn, delay) => {
        let t;
        return () => {
          clearTimeout(t);
          t = setTimeout(fn, delay);
        };
      };

      // Resize handler: only when the width changed (the phone address bar changes the height only)
      const stopResize = onWidthChange(layout, 100);

      // Watch for image loads (fallback if no aspect-ratio defined)
      const debouncedLayout = debounce(layout, 50);
      const imgLoad = () => {
        container.querySelectorAll('img').forEach(img => {
          if (!img.complete) {
            img.addEventListener('load', debouncedLayout, { once: true });
            img.addEventListener('error', debouncedLayout, { once: true });
          }
        });
      };

      // Run layout immediately, then watch for straggler images
      layout();
      imgLoad();

      // Constructor with destroy and recalc function
      container._masonry = {
        recalc: () => {
          layout();
          imgLoad();
        },
        destroy: () => {
          stopResize();
          const items = Array.from(container.children);
          items.forEach(el => {
            el.style.position =
              el.style.width =
              el.style.top =
              el.style.left = '';
          });
          container.style.position =
            container.style.height = '';
        }
      };
    });
  }
  safe("masonry", initMasonryGrid);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const path = location.pathname.replace(/\/+$/, '') || '/';
adGlobal();
if (path === '/') adHome();
if (path === '/gallery') adGallery();

})();
