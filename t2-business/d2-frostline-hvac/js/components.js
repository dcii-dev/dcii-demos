(function () {
  "use strict";

  /**
   * Fetches a same-origin HTML partial and injects it before a mount element.
   *
   * Security notes:
   * - Same-origin check: rejects any response whose final URL differs from
   *   window.location.origin, preventing open-redirect or CDN-swap attacks.
   * - DOMParser: parses HTML in a detached document. <script> tags inside
   *   the parsed fragment are inert (never executed). Inline event handlers
   *   on injected elements are inert — no user input reaches these partials.
   * - Partial paths are hardcoded constants, never user-supplied.
   *
   * @param {string} url     Relative path to the partial HTML file.
   * @param {string} mountId ID of the element to insert before.
   * @return {Promise<void>}
   */
  async function injectPartial(url, mountId) {
    const mount = document.getElementById(mountId);
    if (!mount) {
      return;
    }
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        throw new Error(`Failed to load ${url}: ${res.status}`);
      }
      // Enforce same-origin: reject if resolved URL is off-origin.
      const responseOrigin = new URL(res.url).origin;
      if (responseOrigin !== window.location.origin) {
        throw new Error(`Cross-origin partial rejected: ${res.url}`);
      }
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      mount.before(...doc.body.childNodes);
    } catch (err) {
      console.warn("Component inject error:", err);
    }
  }

  /**
   * Marks the nav link matching the current page filename as active.
   * Runs after both partials are injected.
   */
  function markActiveLink() {
    const current =
      window.location.pathname.split("/").pop() || "frostline-hvac.html";
    document
      .querySelectorAll(".header__nav a, .mobile-nav a")
      .forEach((link) => {
        const linkPage = link.getAttribute("href").split("/").pop();
        const isActive = linkPage === current;
        link.classList.toggle("is-active", isActive);
        link.setAttribute("aria-current", isActive ? "page" : "false");
      });
  }

  /**
   * Adds scroll shadow to the sticky site header.
   */
  function initStickyHeader() {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }
    const onScroll = () => {
      header.classList.toggle("site-header--scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /**
   * Handles mobile hamburger menu toggle with focus trap.
   */
  function initMobileNav() {
    const btn = document.querySelector(".header__hamburger");
    const nav = document.getElementById("mobile-nav");
    if (!btn || !nav) {
      return;
    }

    const FOCUSABLE = [
      "a[href]",
      "button:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    /**
     * Traps Tab / Shift+Tab inside the open nav drawer.
     * @param {KeyboardEvent} e
     */
    function trapFocus(e) {
      if (e.key !== "Tab") {
        return;
      }
      const focusable = Array.from(nav.querySelectorAll(FOCUSABLE));
      if (!focusable.length) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          btn.focus();
        }
      }
    }

    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      btn.classList.toggle("header__hamburger--open", !isOpen);
      nav.hidden = isOpen;
      if (!isOpen) {
        nav.querySelector("a")?.focus();
        nav.addEventListener("keydown", trapFocus);
      } else {
        nav.removeEventListener("keydown", trapFocus);
      }
    });

    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        btn.setAttribute("aria-expanded", "false");
        btn.classList.remove("header__hamburger--open");
        nav.hidden = true;
        nav.removeEventListener("keydown", trapFocus);
      }
    });

    nav.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        btn.setAttribute("aria-expanded", "false");
        btn.classList.remove("header__hamburger--open");
        nav.hidden = true;
        nav.removeEventListener("keydown", trapFocus);
        btn.focus();
      }
    });
  }

  /**
   * Loads both partials then boots shared interactive components.
   */
  async function init() {
    await Promise.all([
      injectPartial("partials/nav.html", "nav-mount"),
      injectPartial("partials/footer.html", "footer-mount"),
    ]);
    markActiveLink();
    initStickyHeader();
    initMobileNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
