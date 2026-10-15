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

  // Contact form via FormSubmit AJAX (homepage only; case study pages have no form)
  var form = document.getElementById('contactForm');
  if (!form) return;
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
// Fixed full-viewport canvas: an irregular mesh of hairline segments
// forming varied geometric shapes, with dots at the vertices that pulse
// with a soft glow. Lines are pre-rendered once per theme/resize; dots
// animate each frame. Honors prefers-reduced-motion (static frame) and
// re-renders on theme change.
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
  var dots = []; // {x, y, phase, speed, accent} in tile coordinates
  var TAU = 6.2832;

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
  // Deterministic pseudo-random so the layout stays put across re-renders.
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  // Matches the vertical fade baked into the line tile.
  function fadeAt(y, total) {
    var t = y / total;
    if (t < 0.55) return 1 - 0.15 * (t / 0.55);
    return 0.85 - 0.55 * ((t - 0.55) / 0.45);
  }

  var inkRgb = [20, 20, 20], accentRgb = [187, 92, 0];

  function render() {
    var cs = getComputedStyle(document.documentElement);
    inkRgb = hexToRgb(cs.getPropertyValue("--ink"));
    accentRgb = hexToRgb(cs.getPropertyValue("--accent"));
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var TW = W + M * 2, TH = H + M * 2;
    tile.width = Math.round(TW * dpr);
    tile.height = Math.round(TH * dpr);
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, TW, TH);

    var rnd = seeded(20261013);
    // Jittered anchor points for even coverage with organic placement.
    var s = 150, pts = [], x, y;
    for (y = -s; y < TH + s; y += s) {
      for (x = -s; x < TW + s; x += s) {
        pts.push({ x: x + (rnd() * 2 - 1) * s * 0.34, y: y + (rnd() * 2 - 1) * s * 0.34 });
      }
    }
    // Connect each point to its nearest neighbors: varied polygons emerge.
    tctx.strokeStyle = rgba(inkRgb, 0.06);
    tctx.lineWidth = 1;
    tctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var d1 = 1e15, d2 = 1e15, d3 = 1e15, n1 = -1, n2 = -1, n3 = -1;
      for (var j = 0; j < pts.length; j++) {
        if (i === j) continue;
        var ddx = pts[i].x - pts[j].x, ddy = pts[i].y - pts[j].y;
        var dd = ddx * ddx + ddy * ddy;
        if (dd < d1) { d3 = d2; n3 = n2; d2 = d1; n2 = n1; d1 = dd; n1 = j; }
        else if (dd < d2) { d3 = d2; n3 = n2; d2 = dd; n2 = j; }
        else if (dd < d3) { d3 = dd; n3 = j; }
      }
      tctx.moveTo(pts[i].x, pts[i].y); tctx.lineTo(pts[n1].x, pts[n1].y);
      tctx.moveTo(pts[i].x, pts[i].y); tctx.lineTo(pts[n2].x, pts[n2].y);
      if (rnd() < 0.3 && n3 >= 0) { tctx.moveTo(pts[i].x, pts[i].y); tctx.lineTo(pts[n3].x, pts[n3].y); }
    }
    tctx.stroke();

    // Dots at the vertices, each with its own pulse phase and speed.
    dots = [];
    for (var k = 0; k < pts.length; k++) {
      dots.push({
        x: pts[k].x, y: pts[k].y,
        phase: rnd() * TAU,
        speed: 0.0006 + rnd() * 0.0011,
        accent: rnd() < 0.05
      });
    }

    // Gentle vertical fade so the pattern whispers out toward the footer.
    var g = tctx.createLinearGradient(0, 0, 0, TH);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.55, "rgba(0,0,0,0.85)");
    g.addColorStop(1, "rgba(0,0,0,0.3)");
    tctx.globalCompositeOperation = "destination-in";
    tctx.fillStyle = g;
    tctx.fillRect(0, 0, TW, TH);
    tctx.globalCompositeOperation = "source-over";
  }

  function paint(t) {
    var dx = reduceMotion ? 0 : Math.sin(t * 0.00011) * 12;
    var dy = reduceMotion ? 0 : Math.cos(t * 0.000083) * 9;
    var TW = W + M * 2, TH = H + M * 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(tile, -M + dx, -M + dy, TW, TH);
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * d.speed + d.phase);
      var fade = fadeAt(d.y, TH);
      var sx = d.x - M + dx, sy = d.y - M + dy;
      var rgb = d.accent ? accentRgb : inkRgb;
      // Soft halo that breathes with the pulse.
      var hr = (d.accent ? 7 : 5) * (0.6 + 0.4 * pulse);
      ctx.fillStyle = rgba(rgb, (d.accent ? 0.1 : 0.045) * pulse * fade + 0.006);
      ctx.beginPath();
      ctx.arc(sx, sy, hr, 0, TAU);
      ctx.fill();
      // Core dot, swelling and brightening with the pulse.
      var cr = (d.accent ? 2.1 : 1.5) * (0.75 + 0.5 * pulse);
      ctx.fillStyle = rgba(rgb, (d.accent ? 0.5 : 0.12) * (0.4 + 0.6 * pulse) * fade);
      ctx.beginPath();
      ctx.arc(sx, sy, cr, 0, TAU);
      ctx.fill();
    }
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

  // Click-to-zoom for case study screenshots.
  // Figures marked .zoomable open an enlarged copy that grows out of the
  // thumbnail and back again. No modal, the reader stays on the page.
  // Click the image or backdrop, or press Escape, to close.
  (function () {
    var triggers = document.querySelectorAll('figure.zoomable img');
    if (!triggers.length) { return; }
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var backdrop = null;
    var clone = null;
    var originImg = null;
    var scrollTop = 0;

    // Largest rect that fits the viewport with padding, never larger
    // than the image's natural size, so zooming never goes blurry.
    var fitRect = function (img) {
      var pad = 24;
      var availW = window.innerWidth - pad * 2;
      var availH = window.innerHeight - pad * 2;
      var naturalW = img.naturalWidth || img.width;
      var naturalH = img.naturalHeight || img.height;
      var scale = Math.min(1, availW / naturalW, availH / naturalH);
      var w = Math.round(naturalW * scale);
      var h = Math.round(naturalH * scale);
      return {
        left: Math.round((window.innerWidth - w) / 2),
        top: Math.round((window.innerHeight - h) / 2),
        width: w,
        height: h
      };
    };

    var setRect = function (el, rect) {
      el.style.left = rect.left + 'px';
      el.style.top = rect.top + 'px';
      el.style.width = rect.width + 'px';
      el.style.height = rect.height + 'px';
    };

    var onKeyDown = function (e) {
      if (e.key === 'Escape') { closeZoom(); }
    };

    var onResize = function () {
      if (clone && originImg) { setRect(clone, fitRect(originImg)); }
    };

    var closeZoom = function () {
      if (!clone || !originImg) { return; }
      var rect = originImg.getBoundingClientRect();
      var closing = clone;
      var closingBackdrop = backdrop;
      var closingOrigin = originImg;
      var finished = false;
      clone = null;
      backdrop = null;
      originImg = null;
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollTop);
      closingBackdrop.classList.remove('is-open');
      var done = function () {
        if (finished) { return; }
        finished = true;
        if (closing.parentNode) { closing.parentNode.removeChild(closing); }
        if (closingBackdrop.parentNode) { closingBackdrop.parentNode.removeChild(closingBackdrop); }
        closingOrigin.focus();
      };
      if (reduceMotion) {
        done();
      } else {
        setRect(closing, { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
        closing.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 400);
      }
    };

    var openZoom = function (img) {
      if (clone) { return; }
      originImg = img;
      scrollTop = window.scrollY;
      var rect = img.getBoundingClientRect();
      backdrop = document.createElement('div');
      backdrop.className = 'zoom-backdrop';
      backdrop.addEventListener('click', closeZoom);
      document.body.appendChild(backdrop);
      clone = document.createElement('img');
      clone.className = 'zoom-clone';
      clone.src = img.currentSrc || img.src;
      clone.alt = img.alt;
      clone.setAttribute('tabindex', '-1');
      clone.addEventListener('click', closeZoom);
      document.body.appendChild(clone);
      setRect(clone, { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('keydown', onKeyDown);
      window.addEventListener('resize', onResize);
      clone.focus();
      // Animate to the fitted size on the next frame, after the
      // starting rect has been painted.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          backdrop.classList.add('is-open');
          if (clone) { setRect(clone, fitRect(img)); }
        });
      });
    };

    triggers.forEach(function (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Enlarge image: ' + img.alt);
      img.addEventListener('click', function () { openZoom(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openZoom(img);
        }
      });
    });
  })();

  render();
  start();
})();
