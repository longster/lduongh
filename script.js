// lduongh v2.0 interactions
(function () {
  'use strict';

  // Nav border on scroll
  var nav = document.getElementById('siteNav');
  var onScroll = function () {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal on scroll
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // Timeline expanders
  document.querySelectorAll('.t-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var detail = btn.parentElement.querySelector('.t-detail');
      detail.style.maxHeight = open ? '0px' : detail.scrollHeight + 'px';
    });
  });

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Keep the hero photo corner cuts at a true 45 degrees, matching the
  // logo mark, no matter the image aspect ratio.
  var fitPhotoCuts = function () {
    var img = document.querySelector('.hero-photo img');
    if (!img) return;
    var w = img.clientWidth, h = img.clientHeight;
    if (!w || !h) return;
    var c = w * 0.12;
    var x = c / w * 100, y = c / h * 100;
    img.style.clipPath = 'polygon(' + x.toFixed(2) + '% 0, 100% 0, 100% ' +
      (100 - y).toFixed(2) + '%, ' + (100 - x).toFixed(2) + '% 100%, 0 100%, 0 ' + y.toFixed(2) + '%)';
  };
  fitPhotoCuts();
  window.addEventListener('resize', fitPhotoCuts);
  window.addEventListener('load', fitPhotoCuts);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fitPhotoCuts); }

  // Contact form via FormSubmit AJAX
  var form = document.getElementById('contactForm');
  var status = form.querySelector('.form-status');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var message = form.message.value.trim();
    if (!name || !email || !message) {
      status.textContent = 'Please fill in every field first.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'That email address does not look right.';
      return;
    }
    status.textContent = 'Sending…';
    fetch('https://formsubmit.co/ajax/b55badcaab79fad692f7c61c3d059b3b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name: name, email: email, message: message,
        _subject: 'Portfolio v2 contact from ' + name
      })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        status.textContent = 'Message sent. I will get back to you soon.';
        form.reset();
      })
      .catch(function () {
        status.textContent = 'Something went wrong. Please email me directly instead.';
      });
  });
})();

/* ---------- theme toggle: auto -> light -> dark -> auto ---------- */
(function () {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  var order = ['auto', 'light', 'dark'];
  function get() {
    try { return localStorage.getItem('ld-theme') || 'auto'; }
    catch (e) { return 'auto'; }
  }
  function apply(t) {
    var root = document.documentElement;
    if (t === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', t);
    try { localStorage.setItem('ld-theme', t); } catch (e) {}
    btn.setAttribute('data-state', t);
    btn.setAttribute('aria-label', 'Theme: ' + t + '. Activate to change.');
  }
  btn.addEventListener('click', function () {
    var next = order[(order.indexOf(get()) + 1) % order.length];
    apply(next);
  });
  apply(get());
})();

// ---------- ambient geometric background ----------
// Fixed full-viewport canvas: a faint triangular lattice of hairlines
// with dots at the vertices, drifting almost imperceptibly. The pattern
// is pre-rendered once per theme/resize; animation is a single drawImage
// per frame. Honors prefers-reduced-motion (static frame) and re-renders
// on theme change.
(function () {
  var canvas = document.getElementById("bgCanvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var tile = document.createElement("canvas");
  var tctx = tile.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, M = 28; // M: drift margin around the viewport
  var rafId = null;

  function hexToRgb(hex) {
    hex = String(hex || "").trim().replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    if (isNaN(n)) return [20, 20, 20];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(rgb, a) {
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")";
  }
  // Deterministic pseudo-random so accent dots stay put across re-renders.
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function render() {
    var cs = getComputedStyle(document.documentElement);
    var ink = hexToRgb(cs.getPropertyValue("--ink"));
    var accent = hexToRgb(cs.getPropertyValue("--accent"));
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    tile.width = Math.round((W + M * 2) * dpr);
    tile.height = Math.round((H + M * 2) * dpr);
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, W + M * 2, H + M * 2);

    var s = 104, rh = s * 0.8660254, rnd = seeded(20261013);
    var cols = Math.ceil((W + M * 2) / s) + 3;
    var rows = Math.ceil((H + M * 2) / rh) + 3;
    var pts = [], r, c;
    for (r = 0; r < rows; r++) {
      pts[r] = [];
      for (c = 0; c < cols; c++) {
        pts[r][c] = { x: c * s + (r % 2 ? s / 2 : 0) - s, y: r * rh - rh };
      }
    }
    // Hairline triangular lattice.
    tctx.strokeStyle = rgba(ink, 0.055);
    tctx.lineWidth = 1;
    tctx.beginPath();
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var p = pts[r][c];
        if (c + 1 < cols) {
          tctx.moveTo(p.x, p.y);
          tctx.lineTo(pts[r][c + 1].x, pts[r][c + 1].y);
        }
        if (r + 1 < rows) {
          var b1 = (r % 2 === 0) ? c : c;
          var b2 = (r % 2 === 0) ? c - 1 : c + 1;
          if (b1 >= 0 && b1 < cols) { tctx.moveTo(p.x, p.y); tctx.lineTo(pts[r + 1][b1].x, pts[r + 1][b1].y); }
          if (b2 >= 0 && b2 < cols) { tctx.moveTo(p.x, p.y); tctx.lineTo(pts[r + 1][b2].x, pts[r + 1][b2].y); }
        }
      }
    }
    tctx.stroke();
    // Dots at every vertex, with a sparse few in the accent color.
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var q = pts[r][c];
        if (rnd() < 0.045) {
          tctx.fillStyle = rgba(accent, 0.4);
          tctx.beginPath();
          tctx.arc(q.x, q.y, 2.1, 0, 6.2832);
          tctx.fill();
        } else {
          tctx.fillStyle = rgba(ink, 0.09);
          tctx.beginPath();
          tctx.arc(q.x, q.y, 1.5, 0, 6.2832);
          tctx.fill();
        }
      }
    }
    // Gentle vertical fade so the pattern whispers out toward the footer.
    var g = tctx.createLinearGradient(0, 0, 0, H + M * 2);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.55, "rgba(0,0,0,0.85)");
    g.addColorStop(1, "rgba(0,0,0,0.3)");
    tctx.globalCompositeOperation = "destination-in";
    tctx.fillStyle = g;
    tctx.fillRect(0, 0, W + M * 2, H + M * 2);
    tctx.globalCompositeOperation = "source-over";
  }

  function paint(t) {
    var dx = reduceMotion ? 0 : Math.sin(t * 0.00011) * 12;
    var dy = reduceMotion ? 0 : Math.cos(t * 0.000083) * 9;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = reduceMotion ? 1 : 0.82 + 0.18 * Math.sin(t * 0.00021);
    ctx.drawImage(tile, -M + dx, -M + dy, W + M * 2, H + M * 2);
    ctx.globalAlpha = 1;
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    if (reduceMotion) {
      paint(0);
      return;
    }
    var loop = function (t) {
      paint(t);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { render(); start(); }, 200);
  });

  // Re-render when the theme changes (manual toggle or OS preference).
  var obs = new MutationObserver(function () { render(); if (reduceMotion) paint(0); });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      render();
      if (reduceMotion) paint(0);
    });
  }

  render();
  start();
})();
