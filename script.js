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

  /* ---------- signature: point cloud ------------------------
     Three clusters — robotics, systems, ML — scattered as noise
     on load, resolving into shape. Signal in, inference out.
  ----------------------------------------------------------- */

  function initCloud() {
    var canvas = document.querySelector('.cloud__canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var css = getComputedStyle(document.documentElement);
    var COLORS = [
      css.getPropertyValue('--near').trim() || '#d9922b',
      css.getPropertyValue('--far').trim() || '#3e7c8c',
      css.getPropertyValue('--ink-2').trim() || '#33474f'
    ];

    var points = [];
    var w = 0;
    var h = 0;
    var start = null;
    var DURATION = 2200;

    function rand(min, max) { return min + Math.random() * (max - min); }

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Cluster centres, staggered vertically and overlapping slightly
      // so the field reads as one scene rather than three separate piles.
      var unit = Math.min(h * 0.32, w * 0.13);
      var centres = [
        { x: w * 0.20, y: h * 0.44, r: unit * 1.00, group: 0 },
        { x: w * 0.52, y: h * 0.60, r: unit * 1.14, group: 1 },
        { x: w * 0.82, y: h * 0.38, r: unit * 0.94, group: 2 }
      ];

      var perCluster = w < 620 ? 80 : 150;
      points = [];

      centres.forEach(function (c) {
        var members = [];
        for (var i = 0; i < perCluster; i++) {
          // Gaussian-ish falloff so clusters have dense cores
          var angle = rand(0, Math.PI * 2);
          var dist = Math.pow(Math.random(), 0.55) * c.r;
          var depth = 1 - dist / c.r;
          var pt = {
            tx: c.x + Math.cos(angle) * dist,
            ty: c.y + Math.sin(angle) * dist * 0.78,
            sx: rand(0, w),
            sy: rand(0, h),
            group: c.group,
            depth: depth,
            size: 0.8 + depth * 2.0,
            delay: Math.random() * 0.32,
            phase: rand(0, Math.PI * 2),
            drift: rand(0.25, 0.9),
            links: []
          };
          members.push(pt);
          points.push(pt);
        }

        // Feature matching: link each point to its nearest neighbours.
        // Drawn faintly, this is what makes the cloud read as structure
        // rather than noise.
        var linkRadius = c.r * 0.19;
        for (var a = 0; a < members.length; a++) {
          var count = 0;
          for (var b = a + 1; b < members.length && count < 2; b++) {
            var dx = members[a].tx - members[b].tx;
            var dy = members[a].ty - members[b].ty;
            if (dx * dx + dy * dy < linkRadius * linkRadius) {
              members[a].links.push(members[b]);
              count++;
            }
          }
        }
      });
    }

    function draw(progress, time) {
      ctx.clearRect(0, 0, w, h);

      var i, p;

      // Resolve each point's current position first so links can use it.
      for (i = 0; i < points.length; i++) {
        p = points[i];
        var local = (progress - p.delay) / (1 - p.delay);
        if (local < 0) local = 0;
        if (local > 1) local = 1;
        // easeOutCubic
        p.e = 1 - Math.pow(1 - local, 3);
        p.x = p.sx + (p.tx - p.sx) * p.e;
        p.y = p.sy + (p.ty - p.sy) * p.e;

        if (!reduceMotion && p.e === 1) {
          p.x += Math.sin(time / 2600 + p.phase) * p.drift;
          p.y += Math.cos(time / 3100 + p.phase) * p.drift;
        }
      }

      // Connector lines fade in only once the points have mostly settled.
      ctx.lineWidth = 0.7;
      for (i = 0; i < points.length; i++) {
        p = points[i];
        if (p.e < 0.72 || !p.links.length) continue;
        var strength = (p.e - 0.72) / 0.28;
        ctx.globalAlpha = 0.16 * strength * (0.3 + p.depth * 0.7);
        ctx.strokeStyle = COLORS[p.group];
        for (var k = 0; k < p.links.length; k++) {
          var q = p.links[k];
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      for (i = 0; i < points.length; i++) {
        p = points[i];
        ctx.globalAlpha = 0.22 + p.depth * 0.7 * (0.35 + p.e * 0.65);
        ctx.fillStyle = COLORS[p.group];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    function frame(time) {
      if (start === null) start = time;
      var progress = Math.min((time - start) / DURATION, 1);
      draw(progress, time);
      requestAnimationFrame(frame);
    }

    build();

    if (reduceMotion) {
      draw(1, 0);
    } else {
      requestAnimationFrame(frame);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        if (reduceMotion) draw(1, 0);
        else start = null;
      }, 180);
    });
  }

  /* ---------- boot ----------------------------------------- */

  function init() {
    markCurrentPage();
    initDrawer();
    initReveal();
    initCloud();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
