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
