/* ============================================================
   Dajen Torralba — portfolio
   ============================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- active nav state ------------------------------
     Nav markup is identical on every page; the current page is
     marked here so nav only ever has to be edited in one shape.
  ----------------------------------------------------------- */

  function markCurrentPage() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('[data-nav] a');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (href === path) {
        links[i].setAttribute('aria-current', 'page');
      }
    }
  }

  /* ---------- mobile drawer -------------------------------- */

  function initDrawer() {
    var toggle = document.querySelector('.menu-toggle');
    var drawer = document.querySelector('.drawer');
    var scrim = document.querySelector('.scrim');
    var closeBtn = document.querySelector('.drawer__close');
    if (!toggle || !drawer || !scrim) return;

    function setOpen(open) {
      drawer.classList.toggle('is-open', open);
      scrim.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open && closeBtn) {
        closeBtn.focus();
      } else if (!open) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () { setOpen(true); });
    scrim.addEventListener('click', function () { setOpen(false); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
    });

    drawer.setAttribute('aria-hidden', 'true');
  }

  /* ---------- scroll reveal -------------------------------- */

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-visible');
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    for (var j = 0; j < items.length; j++) observer.observe(items[j]);
  }

  /* ---------- analytics events ------------------------------
     Pageviews come from the beacon in each page's <head>. This
     covers the three things a pageview count can't answer: did
     they take the resume, did they follow a link out, and how
     far down a page did they actually get.

     track() is a shim so the beacon vendor stays swappable —
     it no-ops when no beacon is loaded, including local dev.
  ----------------------------------------------------------- */

  function track(name, props) {
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(name, props);
      } else if (window.goatcounter && typeof window.goatcounter.count === 'function') {
        window.goatcounter.count({
          path: name + (props && props.target ? '/' + props.target : ''),
          title: name,
          event: true
        });
      }
    } catch (e) {
      /* analytics must never break the page */
    }
  }

  function initEvents() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    // Directory this site is served from, e.g. '/portfolio-project/'.
    var base = window.location.pathname.replace(/[^/]*$/, '');

    // Resume download and outbound clicks share one delegated
    // listener, so links added later are covered automatically.
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a[href]') : null;
      if (!link) return;

      var href = link.getAttribute('href') || '';

      if (/\.pdf$/i.test(href)) {
        track('resume-download', { page: page });
        return;
      }

      if (/^https?:\/\//i.test(href)) {
        var url;
        try {
          url = new URL(href, window.location.href);
        } catch (err) {
          return;
        }

        var host = url.hostname.replace(/^www\./, '');
        var sameHost = host === window.location.hostname.replace(/^www\./, '');

        // Anything under this site's own base path is internal
        // navigation. Comparing hostname alone would wrongly treat a
        // sibling project on the same github.io account as internal.
        if (sameHost && url.pathname.indexOf(base) === 0) return;

        track('outbound', {
          target: sameHost ? host + url.pathname.replace(/\/$/, '') : host,
          page: page
        });
      }
    });
  }

  /* ---------- scroll depth ---------------------------------
     Fires each quartile once. Distinguishes a real read from a
     bounce, which is the whole question on a portfolio.
  ----------------------------------------------------------- */

  function initScrollDepth() {
    var marks = [25, 50, 75, 100];
    var hit = {};
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var ticking = false;

    function measure() {
      ticking = false;
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      // Short pages are fully visible on load; nothing to measure.
      if (scrollable < 200) return;

      var pct = ((window.scrollY || doc.scrollTop) / scrollable) * 100;

      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (!hit[m] && pct >= m - 1) {
          hit[m] = true;
          track('scroll-depth', { depth: String(m), page: page });
        }
      }

      if (hit[100]) window.removeEventListener('scroll', onScroll);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    measure();
  }

  const VISITED_COUNTRIES = [
    "ph", "sa", "gu"
  ];

  async function initTravelMap() {
    const figure = document.getElementById("map-figure");
    const tooltip = document.getElementById("map-tooltip");
    const countEl = document.getElementById("visited-count"); // optional — may not exist
    if (!figure) return;

    let svgText, NAMES;
    try {
      const res = await fetch("assets/world-map.svg");
      if (!res.ok) throw new Error(`world-map.svg: ${res.status}`);
      svgText = await res.text();

      const namesRes = await fetch("assets/country-codes.json");
      if (!namesRes.ok) throw new Error(`country-codes.json: ${namesRes.status}`);
      NAMES = await namesRes.json();
    } catch (err) {
      // Fetching local files fails under file:// (no CORS headers) — this is
      // expected when previewing index.html directly instead of via a local
      // server or the deployed site. Fail quietly with a note instead of
      // leaving a silently broken section.
      console.warn("Travel map failed to load (fetch needs http/https, not file://):", err);
      figure.innerHTML = '<p style="font-size:13px;color:var(--ink-3);">Map unavailable in this preview — open via a local server or the deployed site.</p>';
      return;
    }

    figure.insertAdjacentHTML("afterbegin", svgText);
    const svg = figure.querySelector("svg");
    if (!svg) return;

    // Country boundaries are marked up two ways in this map: most countries
    // have the ISO code as `id` directly on a single <path>, but multi-part
    // countries (island nations, archipelagos) have it on a wrapping <g>
    // containing several <path> children (mainland + islands).
    let visitedCount = 0;
    svg.querySelectorAll("path[id], g[id]").forEach((el) => {
      const code = el.id;
      const name = NAMES[code] || code;
      const paths = el.tagName.toLowerCase() === "g" ? el.querySelectorAll("path") : [el];

      if (VISITED_COUNTRIES.includes(code)) {
        paths.forEach((p) => p.classList.add("visited"));
        visitedCount++;
      }

      el.addEventListener("mousemove", (e) => {
        const rect = figure.getBoundingClientRect();
        tooltip.textContent = name;
        tooltip.style.left = e.clientX - rect.left + "px";
        tooltip.style.top = e.clientY - rect.top + "px";
        tooltip.classList.add("visible");
      });
      el.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));
    });
    if (countEl) countEl.textContent = visitedCount;
  }

  document.addEventListener("DOMContentLoaded", initTravelMap);

  /* ---------- boot ----------------------------------------- */

  function init() {
    markCurrentPage();
    initDrawer();
    initReveal();
    initEvents();
    initScrollDepth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
