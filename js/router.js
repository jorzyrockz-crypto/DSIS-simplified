/**
 * ICS Tracking & Monitoring Tool
 * Phase 1: Core Layout — Client-Side Router
 *
 * Handles hash-based routing and page transitions.
 */

'use strict';

const Router = (() => {
  // ── Route registry ──────────────────────────────────────────────────────
  const routes = {};
  let currentRoute = null;
  let beforeNavHook = null;
  let afterNavHook  = null;

  /**
   * Register a route.
   * @param {string}   hash    - e.g. '#dashboard'
   * @param {Function} handler - called when route activates; receives (params)
   * @param {Object}   [meta]  - { title, contextPanel }
   */
  function register(hash, handler, meta = {}) {
    routes[hash] = { handler, meta };
  }

  /**
   * Navigate to a route programmatically.
   * @param {string} hash
   */
  function navigate(hash) {
    window.location.hash = hash;
  }

  /**
   * Hook called before each navigation.
   * @param {Function} fn - (fromHash, toHash) => boolean; return false to cancel
   */
  function beforeNav(fn) {
    beforeNavHook = fn;
  }

  /**
   * Hook called after each navigation.
   * @param {Function} fn - (hash, meta) => void
   */
  function afterNav(fn) {
    afterNavHook = fn;
  }

  /**
   * Internal: resolve & dispatch — supports async beforeNav hooks.
   * @param {string} normalised  already-normalised hash (e.g. '#records')
   * @param {string|null} previous  the hash we are leaving
   */
  async function _dispatch(normalised, previous) {
    const route = routes[normalised];
    if (!route) return;

    // beforeNav hook — supports sync (bool) and async (Promise<bool>) returns
    if (beforeNavHook) {
      let allowed = beforeNavHook(previous, normalised);
      if (allowed && typeof allowed.then === 'function') allowed = await allowed;
      if (allowed === false) {
        // Restore the previous hash without triggering another hashchange
        if (previous) {
          window.removeEventListener('hashchange', _onHashChange);
          window.location.hash = previous;
          setTimeout(() => window.addEventListener('hashchange', _onHashChange), 0);
        }
        return;
      }
    }

    currentRoute = normalised;

    // Execute the route handler
    route.handler();

    // afterNav hook
    if (afterNavHook) afterNavHook(normalised, route.meta, previous);
  }

  /**
   * hashchange event handler.
   */
  function _onHashChange() {
    const hash       = window.location.hash || '#dashboard';
    const normalised = hash.toLowerCase().split('?')[0];

    // Find matching route (fallback to dashboard)
    if (!routes[normalised]) {
      window.location.replace('#dashboard');
      return;
    }

    if (currentRoute === normalised) return; // no-op if same page

    _dispatch(normalised, currentRoute);
  }

  /**
   * Resolve the current hash and dispatch the correct handler.
   * Kept for backwards-compatibility; used by start() on initial load.
   */
  function resolve() {
    const hash       = window.location.hash || '#dashboard';
    const normalised = hash.toLowerCase().split('?')[0];

    if (!routes[normalised]) {
      window.location.replace('#dashboard');
      return;
    }

    const previous = currentRoute;
    currentRoute   = normalised;

    routes[normalised].handler();
    if (afterNavHook) afterNavHook(normalised, routes[normalised].meta, previous);
  }

  /**
   * Start the router — listens to hash changes.
   */
  function start() {
    window.addEventListener('hashchange', _onHashChange);
    resolve(); // resolve immediately on load (sync, no guard needed)
  }

  /**
   * Get the current active route hash.
   */
  function current() {
    return currentRoute;
  }

  /**
   * Get meta for a given hash.
   */
  function getMeta(hash) {
    return routes[hash]?.meta ?? {};
  }

  return { register, navigate, beforeNav, afterNav, start, current, getMeta };
})();
