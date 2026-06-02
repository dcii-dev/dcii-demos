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
    if (!mount) { return; }
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
      window.location.pathname.split("/").pop() ||
      "verde-valley-landscaping.html";
    document
      .querySelectorAll(".site-nav a, .mobile-nav a")
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
    if (!header) { return; }
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
    const burger = document.querySelector(".site-header__burger");
    const nav = document.getElementById("mobile-nav");
    if (!burger || !nav) { return; }

    const FOCUSABLE_SELECTORS = [
      "a[href]",
      "button:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    /**
     * Traps focus inside the mobile nav drawer.
     * @param {KeyboardEvent} e
     */
    function trapFocus(e) {
      if (e.key !== "Tab") { return; }
      const focusable = Array.from(nav.querySelectorAll(FOCUSABLE_SELECTORS));
      if (focusable.length === 0) { return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          burger.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    /**
     * Opens or closes the mobile nav drawer.
     * @param {boolean} open
     */
    function setOpen(open) {
      burger.setAttribute("aria-expanded", String(open));
      nav.setAttribute("aria-hidden", String(!open));
      nav.classList.toggle("is-open", open);
      const icon = burger.querySelector(".material-symbols-outlined");
      if (icon) { icon.textContent = open ? "close" : "menu"; }
      burger.setAttribute(
        "aria-label",
        open ? "Close navigation menu" : "Open navigation menu"
      );
      if (open) {
        nav.addEventListener("keydown", trapFocus);
        const firstFocusable = nav.querySelector(FOCUSABLE_SELECTORS);
        if (firstFocusable) { firstFocusable.focus(); }
      } else {
        nav.removeEventListener("keydown", trapFocus);
      }
    }

    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { setOpen(false); burger.focus(); }
    });

    for (const link of nav.querySelectorAll("a")) {
      link.addEventListener("click", () => setOpen(false));
    }
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
