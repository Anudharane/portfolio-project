/**
 * assets/js/main.js
 * Public Portfolio – Main JavaScript
 * Handles: Typed.js, AOS, smooth-scroll, navbar, dark mode, skills, contact form
 */

(function () {
  'use strict';

  // ── AOS (Animate On Scroll) ────────────────────────────────────────────────
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, once: true, offset: 80 });
  }

  // ── Typed.js – rotating profession text ───────────────────────────────────
  const typedEl = document.getElementById('typed-text');
  if (typedEl && typeof typedStrings !== 'undefined' && typedStrings.length) {
    new Typed(typedEl, {
      strings: typedStrings,
      typeSpeed: 60,
      backSpeed: 40,
      backDelay: 2000,
      loop: true,
      showCursor: true,
      cursorChar: '|',
    });
  }

  // ── Navbar shrink on scroll ────────────────────────────────────────────────
  const navbar = document.getElementById('mainNavbar');
  function handleNavbar() {
    if (!navbar) return;
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleNavbar, { passive: true });
  handleNavbar();

  // ── Active nav link highlighting on scroll ─────────────────────────────────
  const navLinks = document.querySelectorAll('.navbar-portfolio .nav-link');
  const sections = document.querySelectorAll('section[id]');

  function highlightNav() {
    let current = '';
    const scrollY = window.scrollY + 100;
    sections.forEach((sec) => {
      if (scrollY >= sec.offsetTop) current = sec.getAttribute('id');
    });
    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }
  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  // ── Smooth scrolling for anchor links ─────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        // Close mobile menu
        const bsCollapse = document.getElementById('mainNav');
        if (bsCollapse && bsCollapse.classList.contains('show')) {
          const toggler = document.querySelector('.navbar-toggler');
          if (toggler) toggler.click();
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Dark Mode Toggle ───────────────────────────────────────────────────────
  const darkToggle = document.getElementById('darkToggle');
  const darkIcon   = document.getElementById('darkIcon');
  const htmlEl     = document.documentElement;

  function applyTheme(isDark) {
    htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (darkIcon) {
      darkIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    localStorage.setItem('portfolio-theme', isDark ? 'dark' : 'light');
  }

  // Load saved theme
  const savedTheme = localStorage.getItem('portfolio-theme');
  applyTheme(savedTheme === 'dark');

  if (darkToggle) {
    darkToggle.addEventListener('click', function () {
      const isDark = htmlEl.getAttribute('data-theme') !== 'dark';
      applyTheme(isDark);
    });
  }

  // ── Skill progress bars animate on scroll ─────────────────────────────────
  function animateSkills() {
    document.querySelectorAll('.skill-bar-fill').forEach((bar) => {
      const rect = bar.getBoundingClientRect();
      if (rect.top < window.innerHeight && !bar.classList.contains('animated')) {
        bar.classList.add('animated');
        const width = bar.getAttribute('data-width') || '0';
        bar.style.width = '0%';
        requestAnimationFrame(() => {
          setTimeout(() => {
            bar.style.width = width + '%';
          }, 100);
        });
      }
    });
  }
  window.addEventListener('scroll', animateSkills, { passive: true });
  animateSkills();

  // ── Back to Top button ─────────────────────────────────────────────────────
  const backBtn = document.getElementById('backToTop');
  if (backBtn) {
    window.addEventListener('scroll', function () {
      backBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const form      = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitTxt = document.getElementById('submitText');
  const formAlert = document.getElementById('formAlert');
  const baseUrl   = '';

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Basic validation
      const name    = document.getElementById('senderName').value.trim();
      const email   = document.getElementById('senderEmail').value.trim();
      const message = document.getElementById('senderMessage').value.trim();

      if (!name || !email || !message) {
        showAlert('error', 'Please fill in all required fields.');
        return;
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        showAlert('error', 'Please enter a valid email address.');
        return;
      }

      // Loading state
      if (submitBtn) submitBtn.disabled = true;
      if (submitTxt) submitTxt.textContent = 'Sending…';

      try {
        const csrfToken = (form.querySelector('[name="csrf_token"]') || {}).value || '';
        const res  = await fetch(baseUrl + '/contact_submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            name: document.getElementById('senderName').value.trim(),
            email: document.getElementById('senderEmail').value.trim(),
            subject: (document.getElementById('senderSubject') || {}).value || '',
            message: document.getElementById('senderMessage').value.trim(),
            csrf_token: csrfToken
          }).toString()
        });
        const json = await res.json();

        if (json.success) {
          showAlert('success', json.msg || 'Message sent successfully!');
          form.reset();
        } else {
          showAlert('error', json.msg || 'Something went wrong. Please try again.');
        }
      } catch (err) {
        showAlert('error', 'Network error. Please check your connection.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitTxt) submitTxt.textContent = 'Send Message';
      }
    });
  }

  function showAlert(type, msg) {
    if (!formAlert) return;
    const cls = type === 'success' ? 'alert-form-success' : 'alert-form-error';
    formAlert.innerHTML = `<div class="form-alert ${cls}">${msg}</div>`;
    setTimeout(() => (formAlert.innerHTML = ''), 5000);
  }

  // ── Scroll indicator fade ─────────────────────────────────────────────────
  const scrollIndicator = document.querySelector('.hero-scroll');
  if (scrollIndicator) {
    window.addEventListener('scroll', function () {
      scrollIndicator.style.opacity = window.scrollY > 50 ? '0' : '1';
    }, { passive: true });
  }

  // ── Counter animation for stats ───────────────────────────────────────────
  function animateCounter(el) {
    const target = parseInt(el.textContent.replace(/\D/g, ''), 10);
    if (isNaN(target)) return;
    const hasSuffix = el.textContent.includes('+');
    let current = 0;
    const increment = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current + (hasSuffix ? '+' : '');
    }, 30);
  }

  const statNums = document.querySelectorAll('.stat-num');
  const statsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
          entry.target.classList.add('counted');
          animateCounter(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  statNums.forEach((el) => statsObserver.observe(el));

})();
