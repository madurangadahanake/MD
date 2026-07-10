/* ==========================================================================
   MADURANGA PORTFOLIO — MAIN JAVASCRIPT
   Every bit of JS that used to be scattered inline across each page now
   lives here in one single file, loaded on every page with `defer`.
   ========================================================================== */

/* ---- 1. THEME INIT (runs immediately, before DOMContentLoaded, to avoid a
   flash of the wrong theme when the page first paints) ---- */
(function initTheme() {
    const saved = localStorage.getItem('md-theme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

    if (saved === 'light' || (!saved && prefersLight)) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();

/* ---- 2. Everything else waits for the DOM ---- */
document.addEventListener('DOMContentLoaded', () => {

    /* --- Preloader: fade out the loading screen once the page has loaded --- */
    const preloader = document.getElementById('preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            preloader.classList.add('loader-hidden');
        });
        // Safety net in case the 'load' event already fired
        setTimeout(() => preloader.classList.add('loader-hidden'), 3000);
    }

    /* --- Light-mode floating blobs (injected once per page) --- */
    if (!document.querySelector('.light-blobs')) {
        const blobs = document.createElement('div');
        blobs.className = 'light-blobs';
        blobs.innerHTML = '<span></span><span></span><span></span>';
        document.body.prepend(blobs);
    }

    /* --- Dark / Light mode toggle button --- */
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const root = document.documentElement;
            const isLight = root.getAttribute('data-theme') === 'light';

            if (isLight) {
                root.removeAttribute('data-theme');
                localStorage.setItem('md-theme', 'dark');
            } else {
                root.setAttribute('data-theme', 'light');
                localStorage.setItem('md-theme', 'light');
            }

            themeBtn.classList.remove('theme-flip');
            void themeBtn.offsetWidth; // restart animation
            themeBtn.classList.add('theme-flip');
        });
    }

    /* --- Smooth scroll for on-page anchor links (#about, #services, etc.) --- */
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const hash = this.getAttribute('href');
            if (hash.length > 1) {
                const target = document.querySelector(hash);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.pushState(null, '', hash);
                }
            }
        });
    });

    /* --- Smooth scroll when arriving from another page with a #hash
       (e.g. pages/photography.html -> ../index.html#contact) --- */
    if (window.location.hash) {
        const target = document.querySelector(window.location.hash);
        if (target) {
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 350);
        }
    }

    /* --- Header shadow / condense effect on scroll (index page only, but
       harmless if no <header> exists on other pages) --- */
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 30) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    /* --- Simple fade-up reveal animation for cards/sections as they
       scroll into view --- */
    const revealTargets = document.querySelectorAll(
        '.service-card, .custom-about-container, .contact-container, .custom-contact-container'
    );

    if ('IntersectionObserver' in window && revealTargets.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealTargets.forEach(el => {
            el.classList.add('reveal-on-scroll');
            observer.observe(el);
        });
    }

    /* --- Contact form: prevent a real submit (no backend yet) and give
       friendly feedback instead --- */
    const contactForm = document.querySelector('.custom-contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('.contact-submit-btn');
            if (btn) {
                const original = btn.innerHTML;
                btn.innerHTML = 'Message Sent <i class="fa-solid fa-check"></i>';
                btn.disabled = true;
                setTimeout(() => {
                    btn.innerHTML = original;
                    btn.disabled = false;
                    contactForm.reset();
                }, 2500);
            }
        });
    }
});
