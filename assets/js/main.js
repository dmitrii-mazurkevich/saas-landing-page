/* ==========================================================================
   Flowdesk — landing page behaviour
   Vanilla JS, no dependencies. Everything degrades: with JS off the page is
   still readable, the pricing shows monthly rates and the first tab is open.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- strings that only exist in JS ------------------------------ */

  var S = {
    en: {
      billedMonthly: 'Billed monthly, cancel any time',
      billedAnnual: 'Billed once a year at {total} per person',
      analyticsNote: 'Analytics event (demo build, nothing is sent):'
    },
    ru: {
      billedMonthly: 'Оплата помесячно, отмена в любой момент',
      billedAnnual: 'Один платёж в год — {total} за человека',
      analyticsNote: 'Событие аналитики (демо-сборка, ничего не отправляется):'
    }
  };

  function lang() { return root.getAttribute('data-lang') || 'en'; }
  function s(key) { return (S[lang()] || S.en)[key] || S.en[key] || key; }

  /* Numbers: thin space in Russian, comma in English. Prices stay in USD. */
  function num(n) {
    var rounded = Math.round(n);
    var sep = lang() === 'ru' ? ' ' : ',';
    return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  function money(n) { return '$' + num(n); }

  /* ---------- theme ------------------------------------------------------ */

  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('fd-theme', next); } catch (e) {}
    });
  });

  /* ---------- sticky header --------------------------------------------- */

  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 6); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- mobile menu ------------------------------------------------ */

  var navToggle = document.querySelector('.nav-toggle');
  var mobileMenu = document.getElementById('mobile-menu');

  if (navToggle && mobileMenu) {
    var setMenu = function (open) {
      mobileMenu.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    navToggle.addEventListener('click', function () {
      setMenu(!mobileMenu.classList.contains('is-open'));
    });
    mobileMenu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) { setMenu(false); navToggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 940) setMenu(false); });
  }

  /* ---------- feature tabs ------------------------------------------------
     Proper tab semantics: roving tabindex, arrow keys, Home/End.
     ---------------------------------------------------------------------- */

  var tablist = document.querySelector('.tablist');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) {
          panel.classList.toggle('is-active', selected);
          panel.hidden = !selected;
        }
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { selectTab(tab, false); });
    });

    tablist.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i === -1) return;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });

    selectTab(tabs[0], false);
  }

  /* ---------- pricing toggle ---------------------------------------------- */

  var billingButtons = document.querySelectorAll('.billing button[data-billing]');

  function setBilling(mode) {
    billingButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-billing') === mode));
    });

    document.querySelectorAll('[data-price]').forEach(function (el) {
      var value = Number(el.getAttribute(mode === 'annual' ? 'data-annual' : 'data-monthly'));
      el.textContent = '$' + value;

      var plan = el.closest('.plan');
      var note = plan && plan.querySelector('[data-billed-note]');
      if (note) {
        note.textContent = mode === 'annual'
          ? s('billedAnnual').replace('{total}', money(value * 12))
          : s('billedMonthly');
      }
    });

    try { localStorage.setItem('fd-billing', mode); } catch (e) {}
  }

  if (billingButtons.length) {
    billingButtons.forEach(function (b) {
      b.addEventListener('click', function () { setBilling(b.getAttribute('data-billing')); });
    });
    var savedBilling = 'monthly';
    try { savedBilling = localStorage.getItem('fd-billing') || 'monthly'; } catch (e) {}
    setBilling(savedBilling === 'annual' ? 'annual' : 'monthly');
  }

  /* ---------- ROI calculator -----------------------------------------------
     Assumptions are visible on the page rather than buried here:
       21 working days a month, 18% less handling time, Team plan at $29/seat.
     ------------------------------------------------------------------------ */

  var WORKING_DAYS = 21;
  var TIME_SAVED = 0.18;
  var SEAT_PRICE = 29;

  var agentsEl = document.getElementById('agents');

  function recalc() {
    var agents = Number(agentsEl.value);
    var tickets = Number(document.getElementById('tickets').value);
    var handling = Number(document.getElementById('handling').value);
    var rate = Number(document.getElementById('rate').value);

    var messages = agents * tickets * WORKING_DAYS;
    var hours = (messages * handling * TIME_SAVED) / 60;
    var saved = hours * rate;
    var cost = agents * SEAT_PRICE;

    document.getElementById('agents-out').textContent = String(agents);
    document.getElementById('tickets-out').textContent = String(tickets);
    document.getElementById('handling-out').textContent = String(handling);
    document.getElementById('rate-out').textContent = '$' + rate;

    document.getElementById('messages-out').textContent = num(messages);
    document.getElementById('hours-out').textContent = num(hours);
    document.getElementById('cost-out').textContent = money(cost);
    document.getElementById('saving-out').textContent = money(saved);

    var netEl = document.getElementById('net-out');
    netEl.textContent = money(saved - cost);
    netEl.style.color = saved - cost > 0 ? 'var(--accent)' : 'var(--danger)';
  }

  if (agentsEl) {
    ['agents', 'tickets', 'handling', 'rate'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', recalc);
    });
    recalc();
  }

  /* ---------- language changes redraw the numbers --------------------------- */

  document.addEventListener('languagechange', function () {
    if (agentsEl) recalc();
    if (billingButtons.length) {
      var active = document.querySelector('.billing button[aria-pressed="true"]');
      setBilling(active ? active.getAttribute('data-billing') : 'monthly');
    }
  });

  /* ---------- FAQ ----------------------------------------------------------- */

  document.querySelectorAll('.faq__q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (panel) panel.classList.toggle('is-open', !open);
    });
  });

  /* ---------- scroll reveal ------------------------------------------------- */

  var revealables = document.querySelectorAll('.reveal');
  if (revealables.length) {
    if (!('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      revealables.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- counters ------------------------------------------------------ */

  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length && 'IntersectionObserver' in window) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseFloat(el.dataset.countTo);
        cio.unobserve(el);
        if (reduce) { el.textContent = String(target); return; }
        var start = performance.now(), dur = 900;
        var tick = function (now) {
          var p = Math.min((now - start) / dur, 1);
          el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- analytics ------------------------------------------------------
     Every call to action carries a data-analytics name. On a real site this is
     the only wiring GTM or GA4 needs; here it just logs, so the demo sends
     nothing anywhere.
     -------------------------------------------------------------------------- */

  window.dataLayer = window.dataLayer || [];

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-analytics]');
    if (!el) return;
    var payload = {
      event: 'cta_click',
      cta_id: el.getAttribute('data-analytics'),
      cta_text: el.textContent.trim().slice(0, 60),
      page: location.pathname,
      language: lang()
    };
    window.dataLayer.push(payload);
    if (window.console && console.info) console.info(s('analyticsNote'), payload);
  });

  /* ---------- year ------------------------------------------------------------ */

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
