/* =========================================================
   KAMIT LEDGERWORKS — interactions
   ========================================================= */
(function () {
  "use strict";
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    setYear();
    stickyHeader();
    mobileMenu();
    prepChart();
    revealOnScroll();
    activeNavOnScroll();
    contactForm();
  });

  /* ---- current year in footer ---- */
  function setYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---- header gains shadow/border after scroll ---- */
  function stickyHeader() {
    var header = document.getElementById("siteHeader");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- mobile menu ---- */
  function mobileMenu() {
    var toggle = document.getElementById("navToggle");
    var menu = document.getElementById("mobileMenu");
    if (!toggle || !menu) return;

    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.hidden = !open;
    };

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    // close when a link is tapped
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    // close on escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    // reset if resized up to desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) setOpen(false);
    });
  }

  /* ---- measure chart path so it draws accurately ---- */
  function prepChart() {
    document.querySelectorAll(".chart-line").forEach(function (path) {
      try {
        var len = Math.ceil(path.getTotalLength());
        path.style.setProperty("--len", len);
      } catch (e) {
        path.style.setProperty("--len", 600);
      }
    });
  }

  /* ---- reveal-on-scroll + trigger counters/charts ---- */
  function revealOnScroll() {
    var reveals = document.querySelectorAll(".reveal");
    var animatedBlocks = document.querySelectorAll(
      ".hero-visual, .why-visual, .stats-band, .float-chip--gauge"
    );

    if (prefersReduced || !("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("in-view"); });
      animatedBlocks.forEach(function (el) { el.classList.add("in-view"); });
      document.querySelectorAll(".stat-value").forEach(function (el) {
        el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
      });
      return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("in-view");
        // kick off counters inside a revealed stats band (or an individual .stat.reveal)
        el.querySelectorAll && el.querySelectorAll(".stat-value").forEach(countUp);
        obs.unobserve(el);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

    reveals.forEach(function (el) { io.observe(el); });
    animatedBlocks.forEach(function (el) {
      if (!el.classList.contains("reveal")) io.observe(el);
    });
  }

  /* ---- animated count-up for stat values ---- */
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (prefersReduced) { el.textContent = target + suffix; return; }

    var duration = 1600;
    var start = null;
    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var val = Math.round(target * ease(p));
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(frame);
  }

  /* ---- highlight active nav link based on section in view ---- */
  function activeNavOnScroll() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.nav-links a[href^="#"]')
    );
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    links.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = link;
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          var active = map[entry.target.id];
          if (active) active.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    Object.keys(map).forEach(function (id) {
      io.observe(document.getElementById(id));
    });
  }

  /* ---- contact form validation + faux submit ---- */
  function contactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    var success = document.getElementById("formSuccess");
    var fail = document.getElementById("formFail");

    var validators = {
      name: function (v) { return v.trim().length >= 2 || "Please enter your name."; },
      email: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email address.";
      },
      message: function (v) { return v.trim().length >= 10 || "Tell us a little more (10+ characters)."; }
    };

    function validateField(input) {
      var rule = validators[input.name];
      if (!rule) return true;
      var res = rule(input.value);
      var field = input.closest(".field");
      var err = field ? field.querySelector(".field-error") : null;
      if (res === true) {
        field && field.classList.remove("invalid");
        if (err) err.textContent = "";
        input.setAttribute("aria-invalid", "false");
        return true;
      }
      field && field.classList.add("invalid");
      if (err) err.textContent = res;
      input.setAttribute("aria-invalid", "true");
      return false;
    }

    // live-clear errors as the user fixes them
    Object.keys(validators).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      input.addEventListener("blur", function () { validateField(input); });
      input.addEventListener("input", function () {
        if (input.closest(".field").classList.contains("invalid")) validateField(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      var firstBad = null;
      Object.keys(validators).forEach(function (name) {
        var input = form.elements[name];
        if (input && !validateField(input)) {
          ok = false;
          if (!firstBad) firstBad = input;
        }
      });
      if (!ok) { firstBad && firstBad.focus(); return; }

      var btn = form.querySelector('button[type="submit"]');
      var btnLabel = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      if (fail) fail.hidden = true;

      var showSuccess = function () {
        form.querySelectorAll(".field, .form-note, button[type=submit]").forEach(function (el) {
          el.style.display = "none";
        });
        if (success) {
          success.hidden = false;
          // The focused submit button was just removed — move focus to the
          // confirmation so keyboard users keep their place and AT announces it.
          success.setAttribute("tabindex", "-1");
          success.focus({ preventScroll: true });
          success.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
        }
      };
      var showError = function () {
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        if (fail) {
          fail.hidden = false;
          fail.setAttribute("tabindex", "-1");
          fail.focus({ preventScroll: true });
        }
      };

      // Real submission via Web3Forms — AJAX keeps the inline success message.
      fetch("https://api.web3forms.com/submit", { method: "POST", body: new FormData(form) })
        .then(function (res) {
          return res.json().then(function (j) { return j; }, function () { return { success: res.ok }; });
        })
        .then(function (json) { if (json && json.success) { showSuccess(); } else { showError(); } })
        .catch(showError);
    });
  }
})();
