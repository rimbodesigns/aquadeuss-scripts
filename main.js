/*
 * Aquadeuss site scripts (staging-aquadeuss.webflow.io)
 * Migrated from Slater project 17429 on 2026-11-14. Originals in slater/.
 * v1.1.0: reduced-motion support, logo timer pauses in background tabs, service-card hover on every page.
 * v1.2.0: logo and MENU turn white over [data-nav-theme="dark"] sections and while the menu is open.
 * One section per page or feature; the router at the bottom decides what runs where.
 * Needs GSAP + ScrollTrigger, SplitText, CustomEase, Draggable, InertiaPlugin (Webflow GSAP integration),
 * registered by the inline gsap.registerPlugin(...) in the Webflow footer before this file.
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

    let tl = gsap.timeline()

    const openNav = () => {
      navWrap.setAttribute("data-nav", "open")

      tl.clear()
        .set(navWrap, { display: "block" })
        .set(menu, { xPercent: 0 }, "<")
        .fromTo(menuButtonTexts, { yPercent: 0, color: "#001A54" }, {
          yPercent: -100,
          color: "#EFF8FB",
          stagger: 0.2
        })
        .fromTo(menuButtonIcon, { rotate: 0, color: "#001A54" }, { rotate: 315, color: "#EFF8FB" },
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
    }

    const closeNav = () => {
      navWrap.setAttribute("data-nav", "closed")

      tl.clear()
        .to(overlay, { autoAlpha: 0 })
        .to(menu, { xPercent: 120 }, "<")
        .to(menuButtonTexts, { yPercent: 0, color: "#001A54" }, "<")
        .to(menuButtonIcon, { rotate: 0, color: "#001A54" }, "<")
        .set(navWrap, { display: "none" })
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
    document.querySelectorAll('[data-accordion-css-init]').forEach((accordion) => {
      const closeSiblings = accordion.getAttribute('data-accordion-close-siblings') === 'true';

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

        tl = gsap.timeline({ repeat: -1, repeatDelay: loopDelay });
        tl.call(swapNext);
        tl.play();
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

      ScrollTrigger.create({
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => tl.play(),
        onLeave: () => tl.pause(),
        onEnterBack: () => tl.play(),
        onLeaveBack: () => tl.pause()
      });

      document.addEventListener('visibilitychange', () =>
        document.hidden ? tl.pause() : tl.play()
      );
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

    forms.forEach((form) => {
      const fields = form.querySelectorAll('[data-validate] input, [data-validate] textarea');
      const submitButtonDiv = form.querySelector(
        '[data-submit]'); // The div wrapping the submit button
      const submitInput = submitButtonDiv && submitButtonDiv.querySelector(
        'input[type="submit"]'); // The actual submit button
      if (!submitButtonDiv || !submitInput) return; // a form without the custom Subscribe button

      // Capture the form load time
      const formLoadTime = new Date().getTime(); // Timestamp when the form was loaded

      // Function to validate individual fields (input or textarea)
      const validateField = (field) => {
        const parent = field.closest('[data-validate]'); // Get the parent div
        const minLength = field.getAttribute('min');
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

        return isValid;
      };

      // Function to start live validation for a field
      const startLiveValidation = (field) => {
        field.addEventListener('input', function () {
          validateField(field);
        });
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
          startLiveValidation(field); // Start live validation for all fields
        });

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

      // Handle clicking the custom submit button
      submitButtonDiv.addEventListener('click', function () {
        // Validate the form first
        if (validateAndStartLiveValidationForAll()) {
          // Only check for spam after all fields are valid
          if (isSpam()) {
            alert('Form submitted too quickly. Please try again.');
            return; // Stop form submission
          }
          submitInput.click(); // Simulate a click on the <input type="submit">
        }
      });

      // Handle pressing the "Enter" key
      form.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
          event.preventDefault(); // Prevent the default form submission

          // Validate the form first
          if (validateAndStartLiveValidationForAll()) {
            // Only check for spam after all fields are valid
            if (isSpam()) {
              alert('Form submitted too quickly. Please try again.');
              return; // Stop form submission
            }
            submitInput.click(); // Trigger our custom form submission
          }
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

    // Responsive
    const mq = window.matchMedia('(min-width: 992px)');
    let useNextForActive = mq.matches;
    mq.addEventListener('change', (e) => {
      useNextForActive = e.matches;
      // Re-apply active to the correct element for this breakpoint
      if (currentEl) {
        applyActive(currentEl, currentIndex, /*animateNumbers=*/ false);
      }
    });

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

    // Click -> go to index (offset only on desktop offset design)
    function mapClickIndex(i) { return useNextForActive ? (i - 1) : i; }
    slides.forEach((slide, i) => {
      slide.addEventListener("click", () => {
        if (slide.classList.contains("active")) return;
        loop.toIndex(mapClickIndex(i), { ease: "power3", duration: 0.725 });
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
      container.querySelectorAll('img').forEach(img => {
        if (img.complete) return;
        const visual = img.closest('.masonry-item__visual') || img.parentElement;
        if (getComputedStyle(visual).aspectRatio !== 'auto') return;
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
